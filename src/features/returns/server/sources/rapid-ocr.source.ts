import 'server-only';
import { z } from 'zod';
import type { OcrMode } from '@/features/returns/model/ocr.schemas';
import type { OcrResponse } from '@/features/returns/model/ocr.types';
import {
	RAPID_OCR_RETRY_AFTER_MS,
	RAPID_OCR_SERVICE_URL,
	RAPID_OCR_TIMEOUT_MS,
} from './ocr.config';

const ENGINE_NAME = 'rapid';

const rapidOcrResponseSchema = z.object({
	width: z.number(),
	height: z.number(),
	ms: z.number(),
	lines: z.array(
		z.object({
			text: z.string(),
			confidence: z.number(),
			bbox: z.object({
				x: z.number(),
				y: z.number(),
				width: z.number(),
				height: z.number(),
			}),
		}),
	),
});

type RapidOcrState = { unavailableUntilMs: number };

const rapidOcrStore = globalThis as typeof globalThis & {
	linkerRapidOcr?: RapidOcrState;
};
rapidOcrStore.linkerRapidOcr ??= { unavailableUntilMs: 0 };
const rapidOcrState = rapidOcrStore.linkerRapidOcr;

/**
 * Czyta klatkę przez usługę RapidOCR (`ocr-service/`).
 *
 * @returns `null`, gdy usługa odrzuciła klatkę albo nie odpowiada; wtedy wołający czyta zapasowym silnikiem.
 * @remarks Po błędzie połączenia lub przekroczeniu czasu usługa jest pomijana przez 15 s.
 */
export async function fetchRapidOcr(
	image: Uint8Array,
	mode: OcrMode,
): Promise<OcrResponse | null> {
	if (rapidOcrState.unavailableUntilMs > Date.now()) {
		return null;
	}
	const startedAt = performance.now();
	try {
		const response = await fetch(`${RAPID_OCR_SERVICE_URL}/ocr`, {
			method: 'POST',
			headers: { 'Content-Type': 'image/jpeg', 'X-Ocr-Mode': mode },
			body: new Uint8Array(image),
			signal: AbortSignal.timeout(RAPID_OCR_TIMEOUT_MS),
			cache: 'no-store',
		});
		if (!response.ok) {
			return null;
		}
		const parsed = rapidOcrResponseSchema.safeParse(await response.json());
		if (!parsed.success) {
			return null;
		}
		return toOcrResponse(
			parsed.data,
			Math.round(performance.now() - startedAt),
		);
	} catch {
		rapidOcrState.unavailableUntilMs = Date.now() + RAPID_OCR_RETRY_AFTER_MS;
		console.warn(
			`[ocr] RapidOCR nie odpowiada (${RAPID_OCR_SERVICE_URL}), przez ${RAPID_OCR_RETRY_AFTER_MS / 1000} s działa tesseract.js`,
		);
		return null;
	}
}

function toOcrResponse(
	{ width, height, lines, ms }: z.output<typeof rapidOcrResponseSchema>,
	totalMilliseconds: number,
): OcrResponse {
	return {
		orientation: 0,
		width,
		height,
		words: lines.map((line) => ({ ...line, engine: ENGINE_NAME })),
		lines: lines.map((line) => ({ ...line, engine: ENGINE_NAME })),
		timings: { [`ocr:${ENGINE_NAME}`]: ms, total: totalMilliseconds },
	};
}
