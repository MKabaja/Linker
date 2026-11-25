import 'server-only';
import type { OcrMode } from '@/features/returns/model/ocr.schemas';
import type { OcrResponse } from '@/features/returns/model/ocr.types';
import type { Rect } from '@/features/returns/model/traces.types';
import {
	type ImageSize,
	readJpegSize,
} from '@/features/returns/utils/jpeg-size';
import {
	calculateMeanConfidence,
	findDigitRegions,
	isReadableOrientation,
	rotateRectBy180,
} from '@/features/returns/utils/ocr-regions';
import { type QueueOutcome, runInOcrQueue } from './ocr-queue';
import { fetchRapidOcr } from './rapid-ocr.source';
import { fetchTesseractOcr, type TesseractRead } from './tesseract-ocr.source';

type Orientation = OcrResponse['orientation'];
type OrientedRead = TesseractRead & { orientation: Orientation };
type OcrFrameRequest = {
	image: Buffer;
	mode: OcrMode;
	scanSession: string;
	signal: AbortSignal;
};
type OcrFrameResult = QueueOutcome<OcrResponse> | { status: 'invalid-image' };

const orientationStore = globalThis as typeof globalThis & {
	linkerLastTesseractOrientation?: Orientation;
};

/**
 * Czyta klatkę JPEG przez kolejkę OCR: RapidOCR, a gdy usługa nie działa, zapasowy tesseract.js.
 *
 * @returns `invalid-image`, gdy bajty nie są JPEG-iem; pozostałe warianty jak w kolejce (`done`, `busy`, `superseded`, `aborted`).
 * @remarks Ramki w wyniku są zawsze w układzie klatki 0°. Błąd silnika rzuca wyjątek.
 */
export async function recognizeOcrFrame(
	request: OcrFrameRequest,
): Promise<OcrFrameResult> {
	const size = readJpegSize(request.image);
	if (!size) {
		return { status: 'invalid-image' };
	}
	return runInOcrQueue({
		scanSession: request.scanSession,
		signal: request.signal,
		run: () => readFrame(request.image, request.mode, size),
	});
}

async function readFrame(
	image: Buffer,
	mode: OcrMode,
	size: ImageSize,
): Promise<OcrResponse> {
	const rapidResponse = await fetchRapidOcr(image, mode);
	return rapidResponse ?? readWithTesseract(image, size);
}

async function readWithTesseract(
	image: Buffer,
	size: ImageSize,
): Promise<OcrResponse> {
	const startedAt = performance.now();
	const general = await readGeneralText(image);
	const regions = findDigitRegions(general.words, size);
	const digitsStartedAt = performance.now();
	const digitReads = await Promise.all(
		regions.map((region) =>
			fetchTesseractOcr('tess-digits', image, {
				orientation: general.orientation,
				region,
			}),
		),
	);
	const reads = [general, ...digitReads];
	const toFrame = (bbox: Rect) =>
		general.orientation === 180 ? rotateRectBy180(bbox, size) : bbox;

	return {
		orientation: general.orientation,
		...size,
		words: reads.flatMap((read) =>
			read.words.map((word) => ({ ...word, bbox: toFrame(word.bbox) })),
		),
		lines: reads.flatMap((read) =>
			read.lines.map((line) => ({ ...line, bbox: toFrame(line.bbox) })),
		),
		timings: {
			'ocr:tess-general': general.durationMilliseconds,
			...(regions.length > 0 && {
				'ocr:tess-digits': elapsedSince(digitsStartedAt),
			}),
			total: elapsedSince(startedAt),
		},
	};
}

async function readGeneralText(image: Buffer): Promise<OrientedRead> {
	const firstOrientation: Orientation =
		orientationStore.linkerLastTesseractOrientation ?? 0;
	const first = await fetchTesseractOcr('tess-general', image, {
		orientation: firstOrientation,
	});
	if (isReadableOrientation(first.words)) {
		return { ...first, orientation: firstOrientation };
	}
	const secondOrientation: Orientation = firstOrientation === 0 ? 180 : 0;
	const second = await fetchTesseractOcr('tess-general', image, {
		orientation: secondOrientation,
	});
	const isSecondBetter =
		calculateMeanConfidence(second.words) >
		calculateMeanConfidence(first.words);
	const chosen: OrientedRead = isSecondBetter
		? { ...second, orientation: secondOrientation }
		: { ...first, orientation: firstOrientation };
	orientationStore.linkerLastTesseractOrientation = chosen.orientation;
	return {
		...chosen,
		durationMilliseconds:
			first.durationMilliseconds + second.durationMilliseconds,
	};
}

function elapsedSince(startedAt: number): number {
	return Math.round(performance.now() - startedAt);
}
