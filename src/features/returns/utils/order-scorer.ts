import type {
	IndexedOrder,
	ScoredCandidate,
	ScoreResult,
	ScoringOptions,
	TraceContribution,
	TraceScore,
} from '@/features/returns/model/order-scoring.types';
import {
	BONUS_TRACE_ID,
	defaultShopMatchingConfig,
} from '@/features/returns/model/returns.constants';
import type {
	TraceKind,
	TraceQuery,
} from '@/features/returns/model/traces.types';
import {
	createOrderMatcher,
	getOrderIndexView,
	MAX_MATCH_COST,
	type OrderMatcher,
} from '@/features/returns/utils/order-matchers';
import {
	type BonusContext,
	bonusBits,
	decide,
	isIdentifyingTrace,
	rankTopOrders,
} from '@/features/returns/utils/score-decision';
import { describeMatchReason } from '@/features/returns/utils/score-reasons';

const COST_WEIGHT_BITS = 5;
const COST_PENALTY_BITS = 1;
const MIN_IDENTIFYING_BITS = 1;

type KindSlotByKind = Record<TraceKind, number>;

const kindSlotByKind: KindSlotByKind = {
	package: 0,
	orderId: 1,
	externalId: 2,
	phone: 3,
	name: 4,
	postcode: 5,
};
const KIND_COUNT = Object.keys(kindSlotByKind).length;

/**
 * Najlepsze bity każdego rodzaju tropu na zamówienie i indeks tropu, który je dał,
 * w płaskich tablicach `orderIndex * KIND_COUNT + slot`.
 */
type KindScores = { bits: Float64Array; traceIndex: Int32Array };

/**
 * Punktuje zamówienia z indeksu według tropów, w bitach.
 *
 * @remarks
 * - Trop daje kandydatowi `log2(N·w/Σw) − koszt`, gdzie `w = 2^(−5·koszt)`; przy samych dokładnych trafieniach to `log2(N/m)`.
 * - Z jednego rodzaju tropu liczy się najlepszy.
 * - Premia za datę (2–40 dni) i status wysyłki tylko dla zamówień z jakimkolwiek tropem.
 * - `auto`, gdy najlepszy ma co najmniej `log2(N)` bitów i 3 bity przewagi; `candidates` od 40% progu (najwyżej 3).
 * - `auto` wymaga tropu identyfikującego (patrz {@link isIdentifyingTrace}); bez niego wynik to najwyżej `candidates`.
 *
 * Pusty indeks daje `none`. Kolejne wywołania z tą samą tablicą `orders` korzystają z przeliczonego widoku.
 */
export function scoreOrders(
	traces: TraceQuery[],
	orders: IndexedOrder[],
	options: ScoringOptions,
): ScoreResult {
	const indexSize = orders.length;
	if (indexSize === 0) {
		return {
			decision: 'none',
			threshold: 0,
			candidates: [],
			traces: traces.map((trace) => ({
				traceId: trace.id,
				matches: 0,
				bits: 0,
			})),
			indexSize,
		};
	}
	const bonusContext: BonusContext = {
		nowMs: options.nowMs,
		shop: options.shop ?? defaultShopMatchingConfig,
	};
	const threshold = Math.log2(indexSize);
	const view = getOrderIndexView(orders);
	const matchers = traces.map((trace) => createOrderMatcher(trace, view));
	const kindScores: KindScores = {
		bits: new Float64Array(indexSize * KIND_COUNT),
		traceIndex: new Int32Array(indexSize * KIND_COUNT).fill(-1),
	};
	const touchedOrders = new Uint8Array(indexSize);
	const touchedIndices: number[] = [];
	const traceScores: TraceScore[] = traces.map((trace, traceIndex) => {
		const score = scoreTrace({
			trace,
			traceIndex,
			matcher: matchers[traceIndex],
		});
		for (const orderIndex of score.orderIndices) {
			if (!touchedOrders[orderIndex]) {
				touchedOrders[orderIndex] = 1;
				touchedIndices.push(orderIndex);
			}
		}
		return { traceId: trace.id, matches: score.matches, bits: score.bits };
	});

	const top = rankTopOrders(touchedIndices, (orderIndex) =>
		totalBits(orderIndex),
	);
	const scoreDecision = decide(top, threshold);
	const decision =
		scoreDecision === 'auto' && !hasIdentifyingTrace(top[0].orderIndex)
			? 'candidates'
			: scoreDecision;
	const candidates: ScoredCandidate[] =
		decision === 'none'
			? []
			: top.map(({ orderIndex, bits }) => ({
					orderId: orders[orderIndex].orderId,
					bits,
					reasons: describeReasons(orderIndex),
				}));
	return { decision, threshold, candidates, traces: traceScores, indexSize };

	function scoreTrace({
		trace,
		traceIndex,
		matcher,
	}: {
		trace: TraceQuery;
		traceIndex: number;
		matcher: OrderMatcher;
	}): { matches: number; bits: number; orderIndices: number[] } {
		const matchedIndices: number[] = [];
		const matchedCosts: number[] = [];
		let weightSum = 0;
		for (let orderIndex = 0; orderIndex < indexSize; orderIndex++) {
			const cost = matcher.costAt(orderIndex);
			if (cost > MAX_MATCH_COST) {
				continue;
			}
			matchedIndices.push(orderIndex);
			matchedCosts.push(cost);
			weightSum += 2 ** (-cost * COST_WEIGHT_BITS);
		}
		const slot = kindSlotByKind[trace.kind];
		const baseBits = Math.log2(indexSize / weightSum);
		const scoredIndices: number[] = [];
		let bestBits = 0;
		for (let match = 0; match < matchedIndices.length; match++) {
			const bits =
				baseBits - matchedCosts[match] * (COST_WEIGHT_BITS + COST_PENALTY_BITS);
			if (bits <= 0) {
				continue;
			}
			const orderIndex = matchedIndices[match];
			bestBits = Math.max(bestBits, bits);
			scoredIndices.push(orderIndex);
			const cell = orderIndex * KIND_COUNT + slot;
			if (bits > kindScores.bits[cell]) {
				kindScores.bits[cell] = bits;
				kindScores.traceIndex[cell] = traceIndex;
			}
		}
		return {
			matches: matchedIndices.length,
			bits: bestBits,
			orderIndices: scoredIndices,
		};
	}

	function totalBits(orderIndex: number): number {
		let bits = bonusBits(orders[orderIndex], bonusContext);
		for (let slot = 0; slot < KIND_COUNT; slot++) {
			bits += kindScores.bits[orderIndex * KIND_COUNT + slot];
		}
		return bits;
	}

	function hasIdentifyingTrace(orderIndex: number): boolean {
		for (let slot = 0; slot < KIND_COUNT; slot++) {
			const cell = orderIndex * KIND_COUNT + slot;
			const traceIndex = kindScores.traceIndex[cell];
			const isIdentifying =
				traceIndex >= 0 &&
				kindScores.bits[cell] >= MIN_IDENTIFYING_BITS &&
				isIdentifyingTrace(
					traces[traceIndex],
					matchers[traceIndex].evidenceCostAt(orderIndex),
				);
			if (isIdentifying) {
				return true;
			}
		}
		return false;
	}

	function describeReasons(orderIndex: number): TraceContribution[] {
		const reasons: TraceContribution[] = [];
		for (let slot = 0; slot < KIND_COUNT; slot++) {
			const cell = orderIndex * KIND_COUNT + slot;
			const traceIndex = kindScores.traceIndex[cell];
			if (traceIndex < 0) {
				continue;
			}
			const trace = traces[traceIndex];
			const matcher = matchers[traceIndex];
			reasons.push({
				traceId: trace.id,
				kind: trace.kind,
				bits: kindScores.bits[cell],
				label: describeMatchReason(
					trace,
					matcher.costAt(orderIndex),
					matcher.matchedValueAt(orderIndex),
				),
			});
		}
		reasons.sort((left, right) => right.bits - left.bits);
		const bonus = bonusBits(orders[orderIndex], bonusContext);
		if (bonus > 0) {
			reasons.push({
				traceId: BONUS_TRACE_ID,
				kind: 'orderId',
				bits: bonus,
				label: 'data i status wysyłki',
			});
		}
		return reasons;
	}
}
