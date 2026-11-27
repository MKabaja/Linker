import type { IndexedOrder } from '@/features/returns/model/order-scoring.types';
import type {
	NumberTraceQuery,
	TraceQuery,
} from '@/features/returns/model/traces.types';
import { type Carrier, detectCarrier } from '@/features/returns/utils/carrier';
import { normalizeCode } from '@/features/returns/utils/normalize-text';
import {
	type CompiledPattern,
	compilePattern,
	matchPackageCompiled,
} from '@/features/returns/utils/pattern-cost';
import { parseReturnReference } from '@/features/returns/utils/return-reference';

const MIN_SUFFIX_LENGTH = 4;
const MAX_RESULTS = 10;

type PackageSuffixQuery = {
	suffix: string;
	orders: IndexedOrder[];
	carrier?: Carrier;
	/** Zamówienia z już przyjętym zwrotem. */
	excludedOrderIds?: ReadonlySet<number>;
	/** Tropy bieżącego skanu; częściowe odczyty numerów paczek ustawiają kolejność wyników. */
	traces?: TraceQuery[];
};

type PackageSuffixMatch = { order: IndexedOrder; packageNumber: string };

type PackageSuffixResult =
	| { status: 'orders'; matches: PackageSuffixMatch[] }
	| { status: 'return-reference'; reference: string }
	| { status: 'too-short' };

type RankedMatch = PackageSuffixMatch & { traceCost: number };

/**
 * Szuka zamówień, których numer paczki kończy się podaną końcówką (po normalizacji: wielkie litery i cyfry).
 *
 * @remarks
 * - Końcówka krótsza niż 4 znaki daje `too-short`; kod zwrotu Allegro (`NZ5J/2026`) daje `return-reference`,
 *   który rozwiązuje wywołujący.
 * - Zamówienia z `excludedOrderIds` i numery innego przewoźnika (gdy podano `carrier`) są pomijane.
 * - Kolejność: najpierw podobieństwo numeru do częściowych odczytów paczek z `traces`, potem data zamówienia
 *   malejąco. Najwyżej 10 wyników.
 */
function findOrdersByPackageSuffix({
	suffix,
	orders,
	carrier,
	excludedOrderIds,
	traces = [],
}: PackageSuffixQuery): PackageSuffixResult {
	const reference = parseReturnReference(suffix.toUpperCase());
	if (reference) {
		return { status: 'return-reference', reference };
	}
	const normalizedSuffix = normalizeCode(suffix);
	if (normalizedSuffix.length < MIN_SUFFIX_LENGTH) {
		return { status: 'too-short' };
	}
	const partialReads = collectPartialReads(traces);
	const ranked: RankedMatch[] = [];
	for (const order of orders) {
		if (excludedOrderIds?.has(order.orderId)) {
			continue;
		}
		const packageNumber = order.packageNumbers.find(
			(value) =>
				value.endsWith(normalizedSuffix) &&
				(!carrier || detectCarrier(value) === carrier),
		);
		if (packageNumber) {
			ranked.push({
				order,
				packageNumber,
				traceCost: bestTraceCost(partialReads, packageNumber),
			});
		}
	}
	ranked.sort(compareRankedMatches);
	return {
		status: 'orders',
		matches: ranked
			.slice(0, MAX_RESULTS)
			.map(({ order, packageNumber }) => ({ order, packageNumber })),
	};
}

function collectPartialReads(traces: TraceQuery[]): CompiledPattern[] {
	return traces
		.filter((trace): trace is NumberTraceQuery => trace.kind === 'package')
		.map((trace) => compilePattern(trace.pattern));
}

function bestTraceCost(
	partialReads: CompiledPattern[],
	packageNumber: string,
): number {
	let best = Number.POSITIVE_INFINITY;
	for (const partialRead of partialReads) {
		best = Math.min(best, matchPackageCompiled(partialRead, packageNumber));
	}
	return best;
}

function compareRankedMatches(left: RankedMatch, right: RankedMatch): number {
	if (left.traceCost !== right.traceCost) {
		return left.traceCost < right.traceCost ? -1 : 1;
	}
	return orderDateSeconds(right.order) - orderDateSeconds(left.order);
}

function orderDateSeconds(order: IndexedOrder): number {
	return order.dateConfirmed || order.dateAdd;
}

export {
	findOrdersByPackageSuffix,
	MIN_SUFFIX_LENGTH,
	type PackageSuffixMatch,
	type PackageSuffixQuery,
	type PackageSuffixResult,
};
