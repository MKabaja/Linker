import type { OcrWord } from '@/features/returns/model/ocr.types';
import type { Rect } from '@/features/returns/model/traces.types';
import type { ImageSize } from '@/features/returns/utils/jpeg-size';

const MIN_NUMBER_DIGITS = 8;
const MAX_DIGIT_REGIONS = 3;
const MIN_MEAN_CONFIDENCE = 55;
const MIN_NUMERIC_DIGIT_RATIO = 0.75;
const MAX_GROUP_GAP_TO_HEIGHT_RATIO = 1.5;
const PACKAGE_WORD = /paczk/i;
const NUMBER_ANCHOR = /pacz|nadaw|przesy/i;

type DigitGroup = { box: Rect; digitCount: number };

/**
 * Sprawdza, czy odczyt ma sensowną orientację: wysoka średnia pewność oraz słowo „Paczki” albo ciąg co najmniej 8 cyfr.
 *
 * @remarks Same cyfry nie wystarczą, bo 0, 6, 8 i 9 do góry nogami też są cyframi.
 */
function isReadableOrientation(words: OcrWord[]): boolean {
	if (calculateMeanConfidence(words) < MIN_MEAN_CONFIDENCE) {
		return false;
	}
	return (
		words.some((word) => PACKAGE_WORD.test(word.text)) ||
		groupDigitWords(words).some(
			(group) => group.digitCount >= MIN_NUMBER_DIGITS,
		)
	);
}

/**
 * Średnia pewność słów ważona ich długością; 0 dla pustej listy.
 */
function calculateMeanConfidence(words: OcrWord[]): number {
	const totalLength = words.reduce((sum, word) => sum + word.text.length, 0);
	if (totalLength === 0) {
		return 0;
	}
	const weightedSum = words.reduce(
		(sum, word) => sum + word.confidence * word.text.length,
		0,
	);
	return weightedSum / totalLength;
}

/**
 * Wybiera najwyżej 3 wycinki do odczytu samych cyfr: pas za słowem-kotwicą („Paczki”, „nadawcy”) i grupy co najmniej 8 cyfr, od najdłuższej.
 *
 * @remarks Odczyt całej klatki często urywa długi numer po kilku cyfrach, a ten sam pas czytany jako jedna linia daje prawie cały numer.
 */
function findDigitRegions(words: OcrWord[], size: ImageSize): Rect[] {
	return [
		...findAnchorRegions(words, size),
		...findLongNumberRegions(words, size),
	].slice(0, MAX_DIGIT_REGIONS);
}

/**
 * Przelicza ramkę z obrazu obróconego o 180° na układ klatki.
 */
function rotateRectBy180(rect: Rect, size: ImageSize): Rect {
	return {
		x: size.width - rect.x - rect.width,
		y: size.height - rect.y - rect.height,
		width: rect.width,
		height: rect.height,
	};
}

function findAnchorRegions(words: OcrWord[], size: ImageSize): Rect[] {
	const anchor = words.find((word) => NUMBER_ANCHOR.test(word.text));
	if (!anchor) {
		return [];
	}
	const { bbox } = anchor;
	const x = Math.round(bbox.x + bbox.width * 0.9);
	const y = Math.max(0, Math.round(bbox.y - bbox.height * 0.45));
	const region = {
		x,
		y,
		width: size.width - x,
		height: Math.min(size.height - y, Math.round(bbox.height * 1.9)),
	};
	return region.width > region.height * 3 ? [region] : [];
}

function findLongNumberRegions(words: OcrWord[], size: ImageSize): Rect[] {
	return groupDigitWords(words)
		.filter((group) => group.digitCount >= MIN_NUMBER_DIGITS)
		.sort((left, right) => right.digitCount - left.digitCount)
		.map((group) => addMargin(group.box, size));
}

function groupDigitWords(words: OcrWord[]): DigitGroup[] {
	const numericWords = words
		.filter(isNumericWord)
		.sort((left, right) => left.bbox.x - right.bbox.x);
	const groups: DigitGroup[] = [];
	for (const word of numericWords) {
		const group = groups.find(({ box }) => continuesGroup(box, word.bbox));
		if (group) {
			group.box = unionRects(group.box, word.bbox);
			group.digitCount += countDigits(word.text);
		} else {
			groups.push({ box: word.bbox, digitCount: countDigits(word.text) });
		}
	}
	return groups;
}

function isNumericWord(word: OcrWord): boolean {
	const digitCount = countDigits(word.text);
	return (
		!word.text.includes('*') &&
		digitCount >= 2 &&
		digitCount / word.text.length >= MIN_NUMERIC_DIGIT_RATIO
	);
}

function continuesGroup(box: Rect, next: Rect): boolean {
	const height = Math.max(box.height, next.height);
	const centerDistance = Math.abs(
		box.y + box.height / 2 - (next.y + next.height / 2),
	);
	const gap = next.x - (box.x + box.width);
	return (
		centerDistance < height / 2 && gap < height * MAX_GROUP_GAP_TO_HEIGHT_RATIO
	);
}

function countDigits(text: string): number {
	return text.replace(/\D/g, '').length;
}

function unionRects(left: Rect, right: Rect): Rect {
	const x = Math.min(left.x, right.x);
	const y = Math.min(left.y, right.y);
	return {
		x,
		y,
		width: Math.max(left.x + left.width, right.x + right.width) - x,
		height: Math.max(left.y + left.height, right.y + right.height) - y,
	};
}

function addMargin(box: Rect, size: ImageSize): Rect {
	const marginX = Math.round(box.height * 0.6);
	const marginY = Math.round(box.height * 0.35);
	const x = Math.max(0, box.x - marginX);
	const y = Math.max(0, box.y - marginY);
	return {
		x,
		y,
		width: Math.min(size.width, box.x + box.width + marginX) - x,
		height: Math.min(size.height, box.y + box.height + marginY) - y,
	};
}

export {
	calculateMeanConfidence,
	findDigitRegions,
	isReadableOrientation,
	rotateRectBy180,
};
