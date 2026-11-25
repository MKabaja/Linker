import {
	alignedCost,
	type CompiledPattern,
	compilePattern,
	matchCompiled,
} from '@/features/returns/utils/pattern-cost';
import type { PhoneMask } from '@/features/returns/utils/pattern-parser';

type CompiledPhone =
	| { positional: CompiledPattern; head: null; tail: null }
	| { positional: null; head: CompiledPattern; tail: CompiledPattern };

/**
 * Kompiluje maskę telefonu. Zwraca `null`, gdy nie ma ani wzorca, ani kotwic.
 */
function compilePhone({ pattern, anchored }: PhoneMask): CompiledPhone | null {
	if (pattern) {
		return { positional: compilePattern(pattern), head: null, tail: null };
	}
	if (!anchored) {
		return null;
	}
	return {
		positional: null,
		head: compilePattern([...anchored.prefix]),
		tail: compilePattern([...anchored.suffix]),
	};
}

/**
 * Zwraca koszt dopasowania skompilowanej maski do 9 cyfr telefonu z indeksu.
 * Pusty telefon i koszt powyżej `maxCost` dają `Infinity`.
 */
function matchPhoneCompiled(
	phone: CompiledPhone,
	phoneDigits: string,
	maxCost = Number.POSITIVE_INFINITY,
): number {
	if (!phoneDigits) {
		return Number.POSITIVE_INFINITY;
	}
	if (phone.positional) {
		return matchCompiled(phone.positional, phoneDigits, maxCost);
	}
	const headLength = phone.head.codes.length;
	const tailLength = phone.tail.codes.length;
	if (headLength + tailLength > phoneDigits.length) {
		return Number.POSITIVE_INFINITY;
	}
	const headCost = alignedCost(phone.head, phoneDigits, 0, maxCost);
	if (headCost === Number.POSITIVE_INFINITY) {
		return headCost;
	}
	const tailShift = phoneDigits.length - tailLength;
	return (
		headCost +
		alignedCost(phone.tail, phoneDigits, tailShift, maxCost - headCost)
	);
}

function matchPhone(
	mask: PhoneMask,
	phoneDigits: string,
	maxCost = Number.POSITIVE_INFINITY,
): number {
	const phone = compilePhone(mask);
	return phone
		? matchPhoneCompiled(phone, phoneDigits, maxCost)
		: Number.POSITIVE_INFINITY;
}

/**
 * Sprawdza, czy każdy prefiks pasuje do innego słowa imienia lub nazwiska, w dowolnej kolejności.
 * Obsługuje nazwiska dwuczłonowe (spacja, kreska). Pusta lista prefiksów nie pasuje.
 */
function matchName(
	prefixes: string[],
	firstName: string,
	lastName: string,
): boolean {
	if (prefixes.length === 0) {
		return false;
	}
	const isSimpleName = !/[\s-]/.test(firstName) && !/[\s-]/.test(lastName);
	if (isSimpleName && prefixes.length === 1) {
		return (
			firstName.startsWith(prefixes[0]) || lastName.startsWith(prefixes[0])
		);
	}
	if (isSimpleName && prefixes.length === 2) {
		const [first, second] = prefixes;
		return (
			(firstName.startsWith(first) && lastName.startsWith(second)) ||
			(firstName.startsWith(second) && lastName.startsWith(first))
		);
	}
	const words = `${firstName} ${lastName}`.split(/[\s-]+/).filter(Boolean);
	return prefixes.length <= words.length && canAssignPrefixes(prefixes, words);
}

function canAssignPrefixes(prefixes: string[], words: string[]): boolean {
	if (prefixes.length === 0) {
		return true;
	}
	const [prefix, ...restPrefixes] = prefixes;
	return words.some(
		(word, wordIndex) =>
			word.startsWith(prefix) &&
			canAssignPrefixes(
				restPrefixes,
				words.filter((_, index) => index !== wordIndex),
			),
	);
}

export {
	type CompiledPhone,
	compilePhone,
	matchName,
	matchPhone,
	matchPhoneCompiled,
};
