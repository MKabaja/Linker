import { z } from 'zod';

const rectSchema = z.object({
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
});

const ocrResponseSchema = z.object({
	orientation: z.union([z.literal(0), z.literal(180)]),
	width: z.number(),
	height: z.number(),
	words: z.array(
		z.object({
			text: z.string(),
			confidence: z.number(),
			bbox: rectSchema,
			engine: z.string().optional(),
		}),
	),
	lines: z.array(
		z.object({
			text: z.string(),
			confidence: z.number(),
			bbox: rectSchema,
			engine: z.string(),
		}),
	),
	timings: z.record(z.string(), z.number()),
});

type OcrRequestHeaders = z.output<typeof ocrRequestHeadersSchema>;
type OcrMode = OcrRequestHeaders['mode'];

const ocrRequestHeadersSchema = z.object({
	contentType: z
		.string()
		.regex(/^image\/jpeg\s*(;|$)/i, { error: 'Oczekiwano image/jpeg.' }),
	scanSession: z
		.string()
		.trim()
		.min(1, { error: 'Brak nagłówka X-Scan-Session.' })
		.max(64, { error: 'X-Scan-Session może mieć najwyżej 64 znaki.' }),
	mode: z.enum(['full', 'strip']).default('full'),
});

export {
	type OcrMode,
	type OcrRequestHeaders,
	ocrRequestHeadersSchema,
	ocrResponseSchema,
};
