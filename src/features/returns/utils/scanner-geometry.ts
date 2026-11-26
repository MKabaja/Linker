import type { Rect } from '@/features/returns/model/traces.types';

type Size = { width: number; height: number };

/**
 * Przesunięcie i skala, z jaką klatka wysłana do OCR (`scale`, początek wycinka w `offsetX`/`offsetY`)
 * wróciła na układ współrzędnych wideo.
 */
type FrameCrop = { scale: number; offsetX: number; offsetY: number };

const SQUARE_MIN_RATIO = 0.7;
const SQUARE_MAX_RATIO = 1.4;
const STRIP_OFFSET_IN_SIDES = 0.45;
const STRIP_WIDTH_IN_SIDES = 2.9;
const STRIP_HEIGHT_IN_SIDES = 0.6;

/**
 * Przelicza prostokąt z układu klatki wideo na układ elementu, w którym wideo ma `object-fit: cover`
 * (skala większa z dwóch proporcji, nadmiar przycięty symetrycznie).
 * Zwraca `null`, gdy któryś z wymiarów jest zerowy.
 */
function mapRectToCover({
	rect,
	frame,
	container,
}: {
	rect: Rect;
	frame: Size;
	container: Size;
}): Rect | null {
	if (
		frame.width <= 0 ||
		frame.height <= 0 ||
		container.width <= 0 ||
		container.height <= 0
	) {
		return null;
	}
	const scale = Math.max(
		container.width / frame.width,
		container.height / frame.height,
	);
	const cropX = (frame.width * scale - container.width) / 2;
	const cropY = (frame.height * scale - container.height) / 2;
	return {
		x: rect.x * scale - cropX,
		y: rect.y * scale - cropY,
		width: rect.width * scale,
		height: rect.height * scale,
	};
}

/**
 * Wycinek z małym drukiem „Zwrot do nadawcy do paczki: …” pod kwadratowym DataMatrix etykiety zwrotnej InPost.
 * Geometria względem ramki kodu, gdzie `side` to dłuższy bok.
 */
function stripRegionBelowDataMatrix(bbox: Rect): Rect {
	const side = Math.max(bbox.width, bbox.height);
	return {
		x: bbox.x - side,
		y: bbox.y + bbox.height + side * STRIP_OFFSET_IN_SIDES,
		width: side * STRIP_WIDTH_IN_SIDES,
		height: side * STRIP_HEIGHT_IN_SIDES,
	};
}

/**
 * Sprawdza, czy ramka kodu jest w przybliżeniu kwadratowa (DataMatrix), a nie paskiem kodu kreskowego.
 */
function isSquareLike(bbox: Rect): boolean {
	const ratio = bbox.width / Math.max(1, bbox.height);
	return ratio > SQUARE_MIN_RATIO && ratio < SQUARE_MAX_RATIO;
}

/**
 * Cofa skalowanie i przesunięcie wycinka: ramka z odpowiedzi OCR wraca do współrzędnych pełnej klatki wideo.
 */
function frameRectToVideo(rect: Rect, crop: FrameCrop): Rect {
	return {
		x: rect.x / crop.scale + crop.offsetX,
		y: rect.y / crop.scale + crop.offsetY,
		width: rect.width / crop.scale,
		height: rect.height / crop.scale,
	};
}

export {
	type FrameCrop,
	frameRectToVideo,
	isSquareLike,
	mapRectToCover,
	type Size,
	stripRegionBelowDataMatrix,
};
