import 'server-only';
import {
	type Bbox,
	createScheduler,
	createWorker,
	OEM,
	type Page,
	PSM,
	type RecognizeOptions,
	type Scheduler,
	type WorkerParams,
} from 'tesseract.js';
import type { OcrLine, OcrWord } from '@/features/returns/model/ocr.types';
import type { Rect } from '@/features/returns/model/traces.types';
import {
	TESSERACT_JOB_TIMEOUT_MS,
	TESSERACT_LANG_PATH,
	TESSERACT_POOL_SIZE,
	TESSERACT_WORKER_PATH,
} from './ocr.config';

type TesseractEngineName = 'tess-general' | 'tess-digits';
type TesseractParams = Pick<
	WorkerParams,
	'tessedit_pageseg_mode' | 'tessedit_char_whitelist'
>;
type TesseractParamsByEngine = Record<TesseractEngineName, TesseractParams>;
type TesseractReadOptions = { orientation: 0 | 180; region?: Rect };
type TesseractRead = {
	words: OcrWord[];
	lines: OcrLine[];
	durationMilliseconds: number;
};

const tesseractParamsByEngine: TesseractParamsByEngine = {
	'tess-general': {
		tessedit_pageseg_mode: PSM.SPARSE_TEXT,
		tessedit_char_whitelist:
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789*-:./ ',
	},
	'tess-digits': {
		tessedit_pageseg_mode: PSM.SINGLE_LINE,
		tessedit_char_whitelist: '0123456789 ',
	},
};

const tesseractStore = globalThis as typeof globalThis & {
	linkerTesseractPool?: Promise<Scheduler>;
};

/**
 * Czyta obraz (albo jego wycinek) zapasowym silnikiem tesseract.js. Ramki są w układzie obrazu po obrocie.
 *
 * @remarks
 * Pierwsze wywołanie tworzy pulę 2 workerów (kilka sekund). Dane `eng` są czytane lokalnie z paczki `@tesseract.js-data/eng`, nigdy z CDN.
 * Nieudane utworzenie puli rzuca wyjątek, a kolejne wywołanie próbuje od nowa.
 * Zadanie trwające ponad 15 s kończy się wyjątkiem, a pula jest zamykana i odtwarzana przy następnym wywołaniu.
 */
async function fetchTesseractOcr(
	engine: TesseractEngineName,
	image: Buffer,
	options: TesseractReadOptions,
): Promise<TesseractRead> {
	const scheduler = await getTesseractPool();
	const startedAt = performance.now();
	const recognizeOptions: Partial<RecognizeOptions> & TesseractParams = {
		...tesseractParamsByEngine[engine],
		...(options.region && { rectangle: toRectangle(options.region) }),
		...(options.orientation === 180 && { rotateRadians: Math.PI }),
	};
	const { data } = await runWithTimeout(
		scheduler,
		scheduler.addJob('recognize', image, recognizeOptions, {
			text: false,
			blocks: true,
		}),
	);
	return {
		...collectText(data, engine),
		durationMilliseconds: Math.round(performance.now() - startedAt),
	};
}

async function runWithTimeout<Result>(
	scheduler: Scheduler,
	job: Promise<Result>,
): Promise<Result> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => {
			tesseractStore.linkerTesseractPool = undefined;
			scheduler.terminate().catch(() => undefined);
			reject(new Error('Przekroczono limit czasu tesseract.js.'));
		}, TESSERACT_JOB_TIMEOUT_MS);
	});
	try {
		return await Promise.race([job, timeout]);
	} finally {
		clearTimeout(timer);
		job.catch(() => undefined);
	}
}

function getTesseractPool(): Promise<Scheduler> {
	tesseractStore.linkerTesseractPool ??= createTesseractPool().catch(
		(error: unknown) => {
			tesseractStore.linkerTesseractPool = undefined;
			throw error;
		},
	);
	return tesseractStore.linkerTesseractPool;
}

async function createTesseractPool(): Promise<Scheduler> {
	const scheduler = createScheduler();
	const workers = await Promise.all(
		Array.from({ length: TESSERACT_POOL_SIZE }, () =>
			createWorker('eng', OEM.LSTM_ONLY, {
				langPath: TESSERACT_LANG_PATH,
				workerPath: TESSERACT_WORKER_PATH,
				cacheMethod: 'none',
				gzip: true,
				errorHandler: (error: unknown) =>
					console.error('[ocr] błąd workera tesseract.js', error),
			}),
		),
	);
	for (const worker of workers) {
		await worker.setParameters({ user_defined_dpi: '300' });
		scheduler.addWorker(worker);
	}
	return scheduler;
}

function collectText(
	page: Page,
	engine: TesseractEngineName,
): Pick<TesseractRead, 'words' | 'lines'> {
	const pageLines = (page.blocks ?? []).flatMap((block) =>
		block.paragraphs.flatMap((paragraph) => paragraph.lines),
	);
	const words: OcrWord[] = [];
	const lines: OcrLine[] = [];
	for (const line of pageLines) {
		const lineWords = line.words
			.map((word) => ({
				text: word.text.trim(),
				confidence: word.confidence,
				bbox: toRect(word.bbox),
				engine,
			}))
			.filter((word) => word.text);
		if (lineWords.length === 0) {
			continue;
		}
		words.push(...lineWords);
		lines.push({
			text: lineWords.map((word) => word.text).join(' '),
			confidence: line.confidence,
			bbox: toRect(line.bbox),
			engine,
		});
	}
	return { words, lines };
}

function toRect(bbox: Bbox): Rect {
	return {
		x: bbox.x0,
		y: bbox.y0,
		width: bbox.x1 - bbox.x0,
		height: bbox.y1 - bbox.y0,
	};
}

function toRectangle(region: Rect): RecognizeOptions['rectangle'] {
	return {
		left: region.x,
		top: region.y,
		width: region.width,
		height: region.height,
	};
}

export { fetchTesseractOcr, type TesseractRead };
