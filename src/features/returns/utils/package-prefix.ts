import type { IndexedOrder } from '@/features/returns/model/order-scoring.types';
import type { Pattern } from '@/features/returns/model/traces.types';

const PREFIXED_NUMBER_LENGTH = 24;
const PREFIX_LENGTH = 7;
const PREFIX_MIN_COUNT = 30;
const PREFIX_MIN_MATCH = 5;
const MIN_REPAIRABLE_LENGTH = 16;
const MAX_PREFIX_SHIFT = 2;

type PrefixAlignment = { offset: number; matches: number };

/**
 * Zwraca częste 7-cyfrowe początki 24-cyfrowych numerów paczek w indeksie (np. `6209996`), od najczęstszego.
 * Początek liczy się od 30 numerów.
 */
function collectFrequentPrefixes(orders: IndexedOrder[]): string[] {
	const countByPrefix = new Map<string, number>();
	for (const order of orders) {
		for (const packageNumber of order.packageNumbers) {
			if (!isPrefixedNumber(packageNumber)) {
				continue;
			}
			const prefix = packageNumber.slice(0, PREFIX_LENGTH);
			countByPrefix.set(prefix, (countByPrefix.get(prefix) ?? 0) + 1);
		}
	}
	return [...countByPrefix]
		.filter(([, count]) => count >= PREFIX_MIN_COUNT)
		.sort((left, right) => right[1] - left[1])
		.map(([prefix]) => prefix);
}

/**
 * Podmienia początek długiego odczytu na częsty początek numerów, gdy zgadza się z nim na co najmniej
 * 5 pozycjach przy przesunięciu ±2 (zła, zgubiona lub dodatkowa cyfra na starcie), i przycina wynik do `length`.
 *
 * @returns Poprawiony wzorzec albo `null`, gdy odczyt jest krótszy niż 16 pozycji,
 * początek jest niepodobny albo nic się nie zmienia.
 */
function repairPrefix(
	pattern: Pattern,
	prefix: string,
	length: number,
): Pattern | null {
	if (pattern.length < MIN_REPAIRABLE_LENGTH) {
		return null;
	}
	const alignment = findBestAlignment(pattern, prefix);
	if (alignment.matches < PREFIX_MIN_MATCH) {
		return null;
	}
	const repaired = [
		...prefix,
		...pattern.slice(alignment.offset + prefix.length),
	].slice(0, length);
	return isSamePattern(repaired, pattern) ? null : repaired;
}

function isPrefixedNumber(packageNumber: string): boolean {
	return (
		packageNumber.length === PREFIXED_NUMBER_LENGTH &&
		/^\d+$/.test(packageNumber)
	);
}

function findBestAlignment(pattern: Pattern, prefix: string): PrefixAlignment {
	let best: PrefixAlignment = { offset: 0, matches: -1 };
	for (let offset = -MAX_PREFIX_SHIFT; offset <= MAX_PREFIX_SHIFT; offset++) {
		const matches = countPrefixMatches(pattern, prefix, offset);
		if (matches > best.matches) {
			best = { offset, matches };
		}
	}
	return best;
}

function countPrefixMatches(
	pattern: Pattern,
	prefix: string,
	offset: number,
): number {
	let matches = 0;
	for (let index = 0; index < prefix.length; index++) {
		const slot = pattern[index + offset];
		if (slot?.includes(prefix[index])) {
			matches++;
		}
	}
	return matches;
}

function isSamePattern(left: Pattern, right: Pattern): boolean {
	return (
		left.length === right.length &&
		left.every((slot, index) => slot === right[index])
	);
}

export { collectFrequentPrefixes, PREFIXED_NUMBER_LENGTH, repairPrefix };
