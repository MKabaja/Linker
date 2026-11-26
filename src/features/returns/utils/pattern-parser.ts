import type {
	Pattern,
	PatternSlot,
	PhoneTraceQuery,
} from '@/features/returns/model/traces.types';
import { foldPolishText } from '@/features/returns/utils/normalize-text';

const PHONE_LENGTH = 9;
const MIN_KNOWN_PHONE_DIGITS = 2;
const MAX_KNOWN_ANCHORED_DIGITS = 8;
const STAR_IS_ONE_DIGIT = true;
const MOSTLY_DIGITS_RATIO = 0.7;
const NAME_WORDS = 2;
const DIGIT_ONE_LOOKALIKES = new Set(['i', 'l']);

const digitByLookalike = new Map([
	['O', '0'],
	['o', '0'],
	['I', '1'],
	['l', '1'],
	['|', '1'],
]);
const digitByLookalikeInNumbers = new Map([
	['D', '0'],
	['Q', '0'],
	['i', '1'],
	['S', '5'],
	['s', '5'],
	['B', '8'],
	['Z', '2'],
	['z', '2'],
	['G', '6'],
]);
const HOLE_CHARS = new Set(['?', '_', '*', '·', '•']);
const NUMBER_SEPARATORS = /[\s\-.,:/]/g;

type PhoneMask = Pick<PhoneTraceQuery, 'pattern' | 'anchored'>;

/**
 * Zamienia odczyt numeru z OCR na wzorzec.
 *
 * @remarks
 * - Skleja grupy rozdzielone spacją, kreską lub kropką.
 * - `O`/`I`/`l`/`|` stają się cyframi tylko obok cyfry, żeby `PL` na końcu numeru nie stało się `P1`.
 * - W ciągach w większości cyfrowych także `S`→`5`, `B`→`8`, `Z`→`2`, `G`→`6`, `D`/`Q`→`0`.
 * - `?`, `_`, `*` to dziury; pozostałe litery zostają jako wielkie.
 */
function parseNumberRead(text: string): Pattern {
	const compact = text.replace(NUMBER_SEPARATORS, '');
	const digitCount = compact.replace(/\D/g, '').length;
	const isMostlyDigits = digitCount >= compact.length * MOSTLY_DIGITS_RATIO;
	const pattern: Pattern = [];
	for (let index = 0; index < compact.length; index++) {
		const slot = toNumberSlot(compact, index, isMostlyDigits);
		if (slot !== null) {
			pattern.push(slot);
		}
	}
	return pattern;
}

/**
 * Zamienia maskę telefonu (`7320***83`, `+48 732*****3`) na wzorzec 9 pozycji albo znany początek i koniec.
 * Gdy maska ma mniej niż 2 znane cyfry albo nie jest telefonem, oba pola są `null`.
 */
function parsePhoneMask(text: string): PhoneMask {
	const mask = toPhoneMask(text);
	if (mask === null) {
		return { pattern: null, anchored: null };
	}
	if (!mask.includes('*')) {
		return mask.length === PHONE_LENGTH
			? { pattern: [...mask], anchored: null }
			: { pattern: null, anchored: null };
	}
	if (STAR_IS_ONE_DIGIT && mask.length === PHONE_LENGTH) {
		return toPositionalPhoneMask(mask);
	}
	return toAnchoredPhoneMask(mask);
}

/**
 * Zamienia maskę imienia i nazwiska (`m*** ka***`) na prefiksy słów (`['m', 'ka']`).
 * Liczba gwiazdek jest ignorowana, polskie znaki są zdejmowane.
 *
 * @remarks
 * Prefiksy są tylko literowe: słowo z cyfrą (numer domu `1***`) odpada, podobnie jak
 * jednoliterowe `i`/`l` po imieniu i nazwisku (to samo `1***` przeczytane przez OCR jako litera).
 */
function parseNameMask(text: string): string[] {
	return foldPolishText(text)
		.split(/[\s.,]+/)
		.filter((word) => !/\d/.test(word))
		.map((word) => word.match(/^[a-z]+/)?.[0] ?? '')
		.filter(Boolean)
		.filter(
			(prefix, index) =>
				index < NAME_WORDS || !DIGIT_ONE_LOOKALIKES.has(prefix),
		);
}

/**
 * Zapisuje wzorzec jako tekst: dziura to `_`, alternatywy to `[56]`.
 */
function patternToString(pattern: Pattern): string {
	return pattern.map(slotToString).join('');
}

function toNumberSlot(
	compact: string,
	index: number,
	isMostlyDigits: boolean,
): PatternSlot | null {
	const char = compact[index];
	if (isDigit(char)) {
		return char;
	}
	const isNearDigit =
		isDigit(compact[index - 1]) || isDigit(compact[index + 1]);
	const lookalike = digitByLookalike.get(char);
	if (isNearDigit && lookalike) {
		return lookalike;
	}
	const numberLookalike = digitByLookalikeInNumbers.get(char);
	if (isNearDigit && isMostlyDigits && numberLookalike) {
		return numberLookalike;
	}
	if (HOLE_CHARS.has(char)) {
		return '';
	}
	return /[a-z]/i.test(char) ? char.toUpperCase() : null;
}

function isDigit(char: string | undefined): boolean {
	return char !== undefined && char >= '0' && char <= '9';
}

function toPhoneMask(text: string): string | null {
	let mask = text
		.replace(/[\s\-().]/g, '')
		.replace(/[xX•·]/g, '*')
		.replace(/[Oo]/g, '0');
	if (mask.startsWith('+48')) {
		mask = mask.slice(3);
	}
	if (!/^[\d*]+$/.test(mask)) {
		return null;
	}
	return mask.length === 11 && mask.startsWith('48') ? mask.slice(2) : mask;
}

function toPositionalPhoneMask(mask: string): PhoneMask {
	const pattern = [...mask].map((char) => (char === '*' ? '' : char));
	const knownDigits = pattern.filter(Boolean).length;
	return knownDigits >= MIN_KNOWN_PHONE_DIGITS
		? { pattern, anchored: null }
		: { pattern: null, anchored: null };
}

function toAnchoredPhoneMask(mask: string): PhoneMask {
	const prefix = mask.match(/^\d*/)?.[0] ?? '';
	const suffix = mask.match(/\d*$/)?.[0] ?? '';
	const knownDigits = prefix.length + suffix.length;
	const hasEnoughDigits =
		knownDigits >= MIN_KNOWN_PHONE_DIGITS &&
		knownDigits <= MAX_KNOWN_ANCHORED_DIGITS;
	return hasEnoughDigits
		? { pattern: null, anchored: { prefix, suffix } }
		: { pattern: null, anchored: null };
}

function slotToString(slot: PatternSlot): string {
	if (slot.length === 0) {
		return '_';
	}
	return slot.length === 1 ? slot : `[${slot}]`;
}

export {
	type PhoneMask,
	parseNameMask,
	parseNumberRead,
	parsePhoneMask,
	patternToString,
};
