import type { OcrLine, OcrResponse } from '@/features/returns/model/ocr.types';
import { defaultShopMatchingConfig } from '@/features/returns/model/returns.constants';
import type { ShopMatchingConfig } from '@/features/returns/model/returns.types';
import type {
	RawRead,
	Rect,
	TraceSource,
} from '@/features/returns/model/traces.types';
import {
	extractDpdParcelNumber,
	isInpostReturnNumber,
} from '@/features/returns/utils/carrier';
import {
	classifyDigits,
	isOrderIdPattern,
	MIN_PACKAGE_LENGTH,
	numberRead,
	type ReadContext,
	type ReadOrigin,
} from '@/features/returns/utils/digit-classifier';
import { stripLabelNoise } from '@/features/returns/utils/label-noise';
import { normalizeCode } from '@/features/returns/utils/normalize-text';
import { mergeIntoRows } from '@/features/returns/utils/ocr-rows';
import {
	parseAllegroParcelRead,
	parseNameMask,
	parseNumberRead,
	parsePhoneMask,
} from '@/features/returns/utils/pattern-parser';
import {
	isReturnReferenceRead,
	parseReturnReference,
	RETURN_REFERENCE_IN_TEXT,
} from '@/features/returns/utils/return-reference';
import {
	isShopText,
	isShopTrace,
} from '@/features/returns/utils/shop-exclusions';

const MIN_DIGITS_IN_MIXED_WORD = 4;

const LETTERS = 'a-ząćęłńóśźż';
const NAME_MASK = new RegExp(
	`(?<![${LETTERS}\\d])[${LETTERS}]{1,4}\\*{2,}(?:[\\s.]+[${LETTERS}]{0,4}\\*{2,})*`,
	'gi',
);
const PHONE_MASK = /(?:\+?48[\s-]?)?[\d*xX•](?:[\s-]?[\d*xX•]){6,10}/g;
const POSTCODE = /\b\d{2}\s?-\s?\d{3}\b/g;
const EXTERNAL_ID = /\b(?:\d+X\d+|[0-9a-f]{32})\b/gi;
const MIXED_WORD = /\b[A-Za-z0-9]{8,}\b/g;
const ALLEGRO_PARCEL =
	/(?<![A-Za-z0-9])A[0OoDQ]{2}[A-Za-z0-9]{7}(?![A-Za-z0-9])/g;
const DIGIT_RUN = /[0-9OoIl|]+(?: [0-9OoIl|]+)*/g;
const LETTER_OTHER_THAN_DIGIT_LOOKALIKE = /[A-HJ-NP-Za-hj-km-np-z]/;

type TextExtractor = {
	regex: RegExp;
	isTrace?: (match: string) => boolean;
	toRead: (origin: ReadOrigin) => RawRead | null;
};

const textExtractors: readonly TextExtractor[] = [
	{
		regex: ALLEGRO_PARCEL,
		toRead: (origin) => {
			const pattern = parseAllegroParcelRead(origin.text);
			return pattern ? numberRead('package', pattern, origin) : null;
		},
	},
	{
		regex: RETURN_REFERENCE_IN_TEXT,
		isTrace: isReturnReferenceRead,
		toRead: (origin) => {
			const reference = parseReturnReference(origin.text);
			return reference
				? numberRead('returnReference', [...reference], origin)
				: null;
		},
	},
	{
		regex: NAME_MASK,
		toRead: ({ source, bbox, text }) => {
			const prefixes = parseNameMask(text);
			return prefixes.length > 0
				? {
						kind: 'name',
						source,
						text,
						bbox,
						query: { id: '', kind: 'name', prefixes },
					}
				: null;
		},
	},
	{
		regex: EXTERNAL_ID,
		toRead: (origin) =>
			numberRead('externalId', [...origin.text.toUpperCase()], origin),
	},
	{
		regex: PHONE_MASK,
		isTrace: (match) => {
			const { pattern, anchored } = parsePhoneMask(match);
			return /[*xX•]/.test(match) && (pattern !== null || anchored !== null);
		},
		toRead: ({ source, bbox, text }) => ({
			kind: 'phone',
			source,
			text,
			bbox,
			query: { id: '', kind: 'phone', ...parsePhoneMask(text) },
		}),
	},
	{
		regex: POSTCODE,
		toRead: (origin) =>
			numberRead('postcode', [...origin.text.replace(/\D/g, '')], origin),
	},
	{
		regex: MIXED_WORD,
		isTrace: (match) => LETTER_OTHER_THAN_DIGIT_LOOKALIKE.test(match),
		toRead: (origin) =>
			origin.text.replace(/\D/g, '').length >= MIN_DIGITS_IN_MIXED_WORD
				? classifyDigits(parseNumberRead(origin.text), origin)
				: null,
	},
];

/**
 * Zamienia odpowiedź OCR na odczyty. Linie `tess-digits` i `rapid` są klasyfikowane osobno,
 * pozostałe najpierw sklejane w wiersze (tesseract zwraca je poszatkowane na słowa).
 */
function readsFromOcr(
	response: OcrResponse,
	shop: ShopMatchingConfig = defaultShopMatchingConfig,
): RawRead[] {
	const digitLines = response.lines.filter(
		(line) => line.engine === 'tess-digits',
	);
	const rapidLines = response.lines.filter((line) => line.engine === 'rapid');
	const generalLines = response.lines.filter(
		(line) => line.engine !== 'tess-digits' && line.engine !== 'rapid',
	);
	return [
		...classifyLines(digitLines, 'tess-digits', shop),
		...classifyLines(rapidLines, 'rapid', shop),
		...classifyLines(mergeIntoRows(generalLines), 'tess-general', shop),
	];
}

/**
 * Zamienia tekst wpisany ręcznie na odczyty. Kilka wartości rozdziela się nową linią, przecinkiem lub średnikiem.
 */
function readsFromManual(
	text: string,
	shop: ShopMatchingConfig = defaultShopMatchingConfig,
): RawRead[] {
	return text
		.split(/[\n,;]+/)
		.flatMap((part) => classifyText(part, { source: 'manual', shop }));
}

/**
 * Zamienia kod kreskowy na odczyt. Zwraca `null` dla numeru zwrotnego InPost, kodów krótszych niż 8 znaków
 * i kodów sklepu (np. kod trasy DHL z kodem pocztowym sklepu). Z pełnego kodu DPD bierze sam numer paczki.
 */
function readFromBarcode(
	code: string,
	bbox?: Rect,
	shop: ShopMatchingConfig = defaultShopMatchingConfig,
): RawRead | null {
	const read = classifyBarcode(code, bbox, shop);
	return read && !isShopTrace(read.query, shop) ? read : null;
}

function classifyBarcode(
	code: string,
	bbox: Rect | undefined,
	shop: ShopMatchingConfig,
): RawRead | null {
	const fullCode = normalizeCode(code);
	const normalized = extractDpdParcelNumber(fullCode) ?? fullCode;
	if (isInpostReturnNumber(normalized)) {
		return null;
	}
	const origin: ReadOrigin = { source: 'code', bbox, shop, text: code };
	const pattern = [...normalized];
	if (/^\d+X\d+$/.test(normalized) || /^[0-9A-F]{32}$/.test(normalized)) {
		return numberRead('externalId', pattern, origin);
	}
	if (/^\d+$/.test(normalized) && isOrderIdPattern(pattern, shop)) {
		return numberRead('orderId', pattern, origin);
	}
	return normalized.length >= MIN_PACKAGE_LENGTH
		? numberRead('package', pattern, origin)
		: null;
}

function classifyLines(
	lines: Pick<OcrLine, 'text' | 'bbox'>[],
	source: TraceSource,
	shop: ShopMatchingConfig,
): RawRead[] {
	return lines.flatMap((line) =>
		classifyText(line.text, { source, bbox: line.bbox, shop }),
	);
}

function classifyText(text: string, context: ReadContext): RawRead[] {
	if (isShopText(text, context.shop)) {
		return [];
	}
	const reads: (RawRead | null)[] = [];
	let rest = stripLabelNoise(text);
	for (const { regex, isTrace, toRead } of textExtractors) {
		rest = rest.replace(regex, (match) => {
			if (isTrace && !isTrace(match)) {
				return match;
			}
			reads.push(toRead({ ...context, text: match }));
			return ' ';
		});
	}
	for (const run of rest.match(DIGIT_RUN) ?? []) {
		if (/\d/.test(run)) {
			const origin = { ...context, text: run.trim() };
			reads.push(classifyDigits(parseNumberRead(run), origin));
		}
	}
	return reads.filter(
		(read): read is RawRead =>
			read !== null && !isShopTrace(read.query, context.shop),
	);
}

export { readFromBarcode, readsFromManual, readsFromOcr };
