import { describe, expect, it } from 'vitest';
import {
	frameRectToVideo,
	isSquareLike,
	mapRectToCover,
	stripRegionBelowDataMatrix,
} from '@/features/returns/utils/scanner-geometry';

describe('mapRectToCover', () => {
	const frame = { width: 1600, height: 1200 };

	it('przy tej samej proporcji tylko skaluje', () => {
		const result = mapRectToCover({
			rect: { x: 400, y: 300, width: 200, height: 100 },
			frame,
			container: { width: 800, height: 600 },
		});

		expect(result).toEqual({ x: 200, y: 150, width: 100, height: 50 });
	});

	it('na wysokim ekranie przycina boki klatki', () => {
		const result = mapRectToCover({
			rect: { x: 800, y: 600, width: 160, height: 120 },
			frame,
			container: { width: 400, height: 900 },
		});

		// skala 0,75 (wysokość), klatka 1200 px szeroka, 800 px przycięte symetrycznie
		expect(result).toEqual({ x: 200, y: 450, width: 120, height: 90 });
	});

	it('na szerokim ekranie przycina górę i dół', () => {
		const result = mapRectToCover({
			rect: { x: 0, y: 0, width: 1600, height: 1200 },
			frame,
			container: { width: 1600, height: 600 },
		});

		expect(result).toEqual({ x: 0, y: -300, width: 1600, height: 1200 });
	});

	it('zwraca null dla pustego wymiaru', () => {
		const result = mapRectToCover({
			rect: { x: 0, y: 0, width: 1, height: 1 },
			frame: { width: 0, height: 0 },
			container: { width: 100, height: 100 },
		});

		expect(result).toBeNull();
	});
});

describe('stripRegionBelowDataMatrix', () => {
	it('liczy pasek względem dłuższego boku ramki', () => {
		const strip = stripRegionBelowDataMatrix({
			x: 500,
			y: 100,
			width: 100,
			height: 90,
		});

		expect(strip.x).toBeCloseTo(400);
		expect(strip.y).toBeCloseTo(100 + 90 + 45);
		expect(strip.width).toBeCloseTo(290);
		expect(strip.height).toBeCloseTo(60);
	});
});

describe('isSquareLike', () => {
	it('odróżnia DataMatrix od paska kodu kreskowego', () => {
		expect(isSquareLike({ x: 0, y: 0, width: 100, height: 95 })).toBe(true);
		expect(isSquareLike({ x: 0, y: 0, width: 300, height: 60 })).toBe(false);
	});
});

describe('frameRectToVideo', () => {
	it('cofa skalowanie i przesunięcie wycinka', () => {
		const result = frameRectToVideo(
			{ x: 200, y: 100, width: 400, height: 80 },
			{ scale: 2, offsetX: 50, offsetY: 300 },
		);

		expect(result).toEqual({ x: 150, y: 350, width: 200, height: 40 });
	});
});
