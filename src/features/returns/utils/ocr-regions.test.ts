import { describe, expect, it } from 'vitest';
import type { OcrWord } from '@/features/returns/model/ocr.types';
import {
	findDigitRegions,
	isReadableOrientation,
	rotateRectBy180,
} from '@/features/returns/utils/ocr-regions';

const frame = { width: 1280, height: 480 };

function word(text: string, x: number, confidence = 90): OcrWord {
	return { text, confidence, bbox: { x, y: 200, width: 100, height: 40 } };
}

describe('isReadableOrientation', () => {
	it('uznaje odczyt z długim numerem i wysoką pewnością', () => {
		expect(
			isReadableOrientation([word('62099966', 40), word('8641', 150)]),
		).toBe(true);
	});

	it('odrzuca cyfry z niską pewnością (tekst do góry nogami)', () => {
		expect(isReadableOrientation([word('62099966864', 40, 38)])).toBe(false);
	});

	it('odrzuca pewny odczyt bez numeru i bez słowa „Paczki”', () => {
		expect(isReadableOrientation([word('Nadawca', 40)])).toBe(false);
	});
});

describe('findDigitRegions', () => {
	it('łączy sąsiednie grupy cyfr w jeden wycinek z marginesem', () => {
		const regions = findDigitRegions(
			[word('6209', 100), word('99668', 210)],
			frame,
		);

		expect(regions).toEqual([{ x: 76, y: 186, width: 258, height: 68 }]);
	});

	it('zaczyna od pasa za słowem-kotwicą', () => {
		const [anchorRegion] = findDigitRegions([word('Paczki:', 40)], frame);

		expect(anchorRegion).toMatchObject({ x: 130, width: 1150 });
	});

	it('pomija ciągi z gwiazdkami (zamaskowany telefon)', () => {
		expect(findDigitRegions([word('7320***83', 40)], frame)).toEqual([]);
	});
});

describe('rotateRectBy180', () => {
	it('przelicza ramkę na układ klatki', () => {
		expect(
			rotateRectBy180({ x: 10, y: 20, width: 100, height: 40 }, frame),
		).toEqual({ x: 1170, y: 420, width: 100, height: 40 });
	});
});
