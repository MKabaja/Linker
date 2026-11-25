import type { Rect } from '@/features/returns/model/traces.types';

type OcrWord = {
	text: string;
	confidence: number;
	bbox: Rect;
	engine?: string;
};

type OcrLine = { text: string; confidence: number; bbox: Rect; engine: string };

type OcrTimingsInMilliseconds = Record<string, number>;

/**
 * Wspólny kształt odpowiedzi silników OCR. `bbox` w pikselach klatki o wymiarach `width` × `height`.
 */
type OcrResponse = {
	orientation: 0 | 180;
	width: number;
	height: number;
	words: OcrWord[];
	lines: OcrLine[];
	timings: OcrTimingsInMilliseconds;
};

export type { OcrLine, OcrResponse, OcrTimingsInMilliseconds, OcrWord };
