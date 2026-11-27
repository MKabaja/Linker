import type { Rect } from '@/features/returns/model/traces.types';

type Size = { width: number; height: number };

type Point = { x: number; y: number };

type CoverPointInput = { point: Point; frame: Size; container: Size };

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
const TAP_BAND_HEIGHT_RATIO = 0.35;

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

/**
 * Odwrotność `mapRectToCover` dla punktu: punkt w układzie elementu z `object-fit: cover` wraca do układu klatki wideo.
 * Zwraca `null`, gdy któryś z wymiarów jest zerowy albo punkt wypada poza klatkę.
 */
function mapPointFromCover({
	point,
	frame,
	container,
}: CoverPointInput): Point | null {
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
	const x = (point.x + cropX) / scale;
	const y = (point.y + cropY) / scale;
	const isInside = x >= 0 && x <= frame.width && y >= 0 && y <= frame.height;
	return isInside ? { x, y } : null;
}

/**
 * Pas wokół tapniętego punktu: cała szerokość klatki i 35% jej wysokości, wyśrodkowany na punkcie.
 * Przy krawędzi pas jest przesuwany do wnętrza klatki, więc nie traci wysokości.
 */
function regionAroundPoint(point: Point, frame: Size): Rect {
	const height = Math.min(frame.height, frame.height * TAP_BAND_HEIGHT_RATIO);
	const y = Math.min(Math.max(0, point.y - height / 2), frame.height - height);
	return { x: 0, y, width: frame.width, height };
}

/**
 * Wybiera element, którego ramka leży najbliżej punktu (0, gdy punkt jest w środku ramki; przy remisie pierwszy).
 * Elementy bez ramki są pomijane; zwraca `null`, gdy żaden nie ma ramki.
 */
function pickNearestToPoint<Located extends { bbox?: Rect }>(
	candidates: Located[],
	point: Point,
): Located | null {
	let nearest: Located | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const candidate of candidates) {
		if (!candidate.bbox) {
			continue;
		}
		const distance = distanceToRect(candidate.bbox, point);
		if (distance < nearestDistance) {
			nearest = candidate;
			nearestDistance = distance;
		}
	}
	return nearest;
}

function distanceToRect(rect: Rect, point: Point): number {
	const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
	const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
	return Math.hypot(dx, dy);
}

export {
	type FrameCrop,
	frameRectToVideo,
	isSquareLike,
	mapPointFromCover,
	mapRectToCover,
	type Point,
	pickNearestToPoint,
	regionAroundPoint,
	type Size,
	stripRegionBelowDataMatrix,
};
