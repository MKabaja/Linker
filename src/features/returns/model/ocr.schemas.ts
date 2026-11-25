import { z } from 'zod';

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

export { type OcrMode, type OcrRequestHeaders, ocrRequestHeadersSchema };
