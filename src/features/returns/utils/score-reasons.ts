import type {
	NumberTraceKind,
	TraceQuery,
} from '@/features/returns/model/traces.types';
import { countDiffs } from '@/features/returns/utils/pattern-cost';
import { patternToString } from '@/features/returns/utils/pattern-parser';
import {
	formatPhoneMask,
	shortenNumber,
} from '@/features/returns/utils/trace-format';

type NumberNameByKind = Record<NumberTraceKind, string>;

const numberNameByKind: NumberNameByKind = {
	package: 'numer paczki',
	orderId: 'ID zamówienia',
	externalId: 'ID zewnętrzne',
	postcode: 'kod pocztowy',
	returnReference: 'kod zwrotu',
};

/**
 * Zwraca powód dopasowania po polsku, np. `telefon 7320___83`, `inicjały m/ka`, `numer paczki: 1 cyfra różna`.
 */
export function describeMatchReason(
	trace: TraceQuery,
	cost: number,
	matchedValue: string,
): string {
	if (trace.kind === 'name') {
		return `inicjały ${trace.prefixes.join('/')}`;
	}
	if (trace.kind === 'phone') {
		const mask = formatPhoneMask(trace);
		return cost > 0 ? `telefon ${mask} (≈)` : `telefon ${mask}`;
	}
	const name = numberNameByKind[trace.kind];
	const shortPattern = shortenNumber(patternToString(trace.pattern));
	if (cost === 0) {
		return `${name} ${shortPattern}`;
	}
	const diffs = countDiffs(trace.pattern, matchedValue);
	if (diffs > 0) {
		return `${name}: ${describeDigitDiffs(diffs)}`;
	}
	if (diffs === 0) {
		return `${name} ${shortPattern} (≈)`;
	}
	return `${name}: fragment / brakująca cyfra`;
}

function describeDigitDiffs(diffs: number): string {
	if (diffs === 1) {
		return '1 cyfra różna';
	}
	return diffs >= 2 && diffs <= 4
		? `${diffs} cyfry różne`
		: `${diffs} cyfr różnych`;
}
