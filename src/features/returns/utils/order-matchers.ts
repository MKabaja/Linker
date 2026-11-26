import type { IndexedOrder } from '@/features/returns/model/order-scoring.types';
import type {
	NumberTraceQuery,
	Pattern,
	PhoneTraceQuery,
	TraceQuery,
} from '@/features/returns/model/traces.types';
import {
	compilePhone,
	matchName,
	matchPhoneCompiled,
} from '@/features/returns/utils/contact-match';
import { matchEditCompiled } from '@/features/returns/utils/edit-distance';
import { normalizeCode } from '@/features/returns/utils/normalize-text';
import {
	collectFrequentPrefixes,
	PREFIXED_NUMBER_LENGTH,
	repairPrefix,
} from '@/features/returns/utils/package-prefix';
import {
	collectPackageProfiles,
	findPackageProfile,
	informationalCost,
	type PackageProfileByHead,
	snapToProfile,
} from '@/features/returns/utils/package-profile';
import {
	compilePattern,
	matchCompiled,
	matchPackageCompiled,
} from '@/features/returns/utils/pattern-cost';

const MAX_MATCH_COST = 1.0;
const LONG_NUMBER_DIGITS = 16;
const LONG_NUMBER_MAX_COST = 2.0;
const EDIT_MIN_DIGITS = 14;
const EDIT_HEAD_LENGTH = 3;
const SEED_LENGTH = 6;
const SEED_FROM = 7;
const PHONE_LENGTH = 9;

/**
 * Widok indeksu z wartościami przeliczonymi raz na tablicę zamówień (cache po referencji tablicy).
 */
type OrderIndexView = {
	orders: IndexedOrder[];
	orderIds: string[];
	externalIds: string[];
	postcodes: string[];
	frequentPrefixes: string[];
	packageProfiles: PackageProfileByHead;
};

/**
 * Dopasowanie jednego tropu do zamówień, budowane raz na trop.
 * `costAt` zwraca `Infinity`, gdy zamówienie nie pasuje.
 */
type OrderMatcher = {
	costAt: (orderIndex: number) => number;
	/** Wartość z zamówienia, która dała najlepszy koszt (do opisu powodu); `''` dla imienia. */
	matchedValueAt: (orderIndex: number) => string;
	/**
	 * Koszt jako dowód tożsamości: dla numeru paczki bez skalowania długich numerów i tylko na pozycjach
	 * informacyjnych profilu (pozycje strukturalne nie odróżniają numerów). Dla pozostałych tropów równy `costAt`.
	 */
	evidenceCostAt: (orderIndex: number) => number;
};

type CostMatcher = Omit<OrderMatcher, 'evidenceCostAt'>;

type PackageVariant = (value: string, maxCost: number) => number;

const viewByOrders = new WeakMap<IndexedOrder[], OrderIndexView>();

/**
 * Zwraca widok indeksu. Wynik jest zapamiętany dla tej samej tablicy, więc po przeładowaniu indeksu podaj nową tablicę.
 */
function getOrderIndexView(orders: IndexedOrder[]): OrderIndexView {
	const cached = viewByOrders.get(orders);
	if (cached) {
		return cached;
	}
	const view: OrderIndexView = {
		orders,
		orderIds: orders.map((order) => String(order.orderId)),
		externalIds: orders.map((order) => normalizeCode(order.externalOrderId)),
		postcodes: orders.map((order) => order.postcode),
		frequentPrefixes: collectFrequentPrefixes(orders),
		packageProfiles: collectPackageProfiles(orders),
	};
	viewByOrders.set(orders, view);
	return view;
}

function createOrderMatcher(
	trace: TraceQuery,
	view: OrderIndexView,
): OrderMatcher {
	if (trace.kind === 'name') {
		const { prefixes } = trace;
		const { orders } = view;
		return withCostAsEvidence({
			costAt: (index) =>
				matchName(
					prefixes,
					orders[index].firstNameNorm,
					orders[index].lastNameNorm,
				)
					? 0
					: Number.POSITIVE_INFINITY,
			matchedValueAt: () => '',
		});
	}
	if (trace.kind === 'phone') {
		return withCostAsEvidence(createPhoneMatcher(trace, view));
	}
	if (trace.kind === 'package') {
		return createPackageMatcher(trace.pattern, view);
	}
	return withCostAsEvidence(createNumberMatcher(trace, view));
}

function withCostAsEvidence(matcher: CostMatcher): OrderMatcher {
	return { ...matcher, evidenceCostAt: matcher.costAt };
}

function createPhoneMatcher(
	trace: PhoneTraceQuery,
	{ orders }: OrderIndexView,
): CostMatcher {
	const phone = compilePhone(trace);
	return {
		costAt: (index) => {
			const phoneDigits = orders[index].phoneDigits;
			if (!phone || phoneDigits.length !== PHONE_LENGTH) {
				return Number.POSITIVE_INFINITY;
			}
			return matchPhoneCompiled(phone, phoneDigits, MAX_MATCH_COST);
		},
		matchedValueAt: (index) => orders[index].phoneDigits,
	};
}

function createNumberMatcher(
	trace: NumberTraceQuery,
	view: OrderIndexView,
): CostMatcher {
	const compiled = compilePattern(trace.pattern);
	const length = trace.pattern.length;
	const values =
		trace.kind === 'orderId'
			? view.orderIds
			: trace.kind === 'externalId'
				? view.externalIds
				: view.postcodes;
	return {
		costAt: (index) => {
			const value = values[index];
			if (Math.abs(value.length - length) > 1) {
				return Number.POSITIVE_INFINITY;
			}
			return matchCompiled(compiled, value, MAX_MATCH_COST);
		},
		matchedValueAt: (index) => values[index],
	};
}

function createPackageMatcher(
	pattern: Pattern,
	view: OrderIndexView,
): OrderMatcher {
	const knownDigits = pattern.filter(Boolean).length;
	const costScale =
		knownDigits >= LONG_NUMBER_DIGITS
			? LONG_NUMBER_MAX_COST / MAX_MATCH_COST
			: 1;
	const rawMaxCost = MAX_MATCH_COST * costScale;
	const repairedPatterns = view.frequentPrefixes
		.map((prefix) => repairPrefix(pattern, prefix, PREFIXED_NUMBER_LENGTH))
		.filter((repaired): repaired is Pattern => repaired !== null);
	const variantPatterns = [pattern, ...repairedPatterns].map((variant) =>
		snapToProfile(variant, view.packageProfiles),
	);
	const variants = variantPatterns.map(createPackageVariant);

	function valueCost(value: string, maxCost: number): number {
		let cost = Number.POSITIVE_INFINITY;
		for (const variant of variants) {
			cost = Math.min(cost, variant(value, Math.min(cost, maxCost)));
		}
		return cost;
	}

	function costAt(index: number): number {
		let cost = Number.POSITIVE_INFINITY;
		for (const value of view.orders[index].packageNumbers) {
			cost = Math.min(cost, valueCost(value, Math.min(cost, rawMaxCost)));
		}
		return cost / costScale;
	}

	function matchedValueAt(index: number): string {
		let cost = Number.POSITIVE_INFINITY;
		let matchedValue = '';
		for (const value of view.orders[index].packageNumbers) {
			const current = valueCost(value, Math.min(cost, rawMaxCost));
			if (current < cost) {
				cost = current;
				matchedValue = value;
			}
		}
		return matchedValue;
	}

	function evidenceCostAt(index: number): number {
		const rawCost = costAt(index) * costScale;
		const value = matchedValueAt(index);
		const profile = findPackageProfile(view.packageProfiles, value);
		if (!profile) {
			return rawCost;
		}
		let cost = rawCost;
		for (const variantPattern of variantPatterns) {
			if (variantPattern.length === value.length) {
				cost = Math.min(
					cost,
					informationalCost(variantPattern, value, profile),
				);
			}
		}
		return cost;
	}

	return { costAt, matchedValueAt, evidenceCostAt };
}

function createPackageVariant(pattern: Pattern): PackageVariant {
	const compiled = compilePattern(pattern);
	const usesEditDistance = pattern.filter(Boolean).length >= EDIT_MIN_DIGITS;
	const head = pattern.slice(0, EDIT_HEAD_LENGTH).join('');
	const seeds = usesEditDistance ? collectEditSeeds(pattern) : [];
	return (value, maxCost) => {
		const positionalCost = matchPackageCompiled(compiled, value, maxCost);
		const canSkipEdit =
			!usesEditDistance ||
			positionalCost === 0 ||
			head.length < EDIT_HEAD_LENGTH ||
			!value.startsWith(head) ||
			!seeds.some((seed) => value.includes(seed, SEED_FROM));
		if (canSkipEdit) {
			return positionalCost;
		}
		return Math.min(
			positionalCost,
			matchEditCompiled(compiled, value, Math.min(maxCost, positionalCost)),
		);
	};
}

function collectEditSeeds(pattern: Pattern): string[] {
	const seeds: string[] = [];
	for (let start = SEED_FROM; start + SEED_LENGTH <= pattern.length; start++) {
		const slice = pattern.slice(start, start + SEED_LENGTH);
		if (slice.every((slot) => slot.length === 1)) {
			seeds.push(slice.join(''));
		}
	}
	return seeds;
}

export {
	createOrderMatcher,
	getOrderIndexView,
	MAX_MATCH_COST,
	type OrderIndexView,
	type OrderMatcher,
};
