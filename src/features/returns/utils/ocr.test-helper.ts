import type { OcrResponse } from '@/features/returns/model/ocr.types';
import type { Rect } from '@/features/returns/model/traces.types';

type OcrTestLine = [engine: string, text: string, bbox?: Rect];

const LINE_SPACING = 40;

function createOcrResponse(lines: OcrTestLine[]): OcrResponse {
	return {
		orientation: 0,
		width: 1280,
		height: 960,
		words: [],
		lines: lines.map(([engine, text, bbox], index) => ({
			engine,
			text,
			confidence: 80,
			bbox: bbox ?? { x: 0, y: index * LINE_SPACING, width: 300, height: 20 },
		})),
		timings: {},
	};
}

export { createOcrResponse, type OcrTestLine };
