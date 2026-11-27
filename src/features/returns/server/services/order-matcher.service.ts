import 'server-only';
import type {
	OrderIndexEntry,
	RemoteResult,
} from '@/features/returns/model/order-index.types';
import type {
	IndexedOrder,
	ScoreResult,
} from '@/features/returns/model/order-scoring.types';
import { defaultShopMatchingConfig } from '@/features/returns/model/returns.constants';
import type { TraceQuery } from '@/features/returns/model/traces.types';
import {
	getIndexedOrders,
	invalidateIndexedOrders,
} from '@/features/returns/server/repositories/indexed-orders.cache';
import { upsertIndexedOrders } from '@/features/returns/server/repositories/order-index.repository';
import {
	findRemoteOrderByExternalId,
	findRemoteOrderById,
} from '@/features/returns/server/repositories/remote-orders.repository';
import { normalizeCode } from '@/features/returns/utils/normalize-text';
import { scoreOrders } from '@/features/returns/utils/order-scorer';
import { collectReturnReferences } from '@/features/returns/utils/return-reference';
import { getProcessSingleton } from '@/shared/lib/process-singleton';

const MAX_LIVE_LOOKUPS = 2;
const LIVE_MISS_TTL_MILLISECONDS = 10 * 60_000;
const EXTERNAL_ID_PATTERN = /^[A-Z0-9]{6,64}$/;
const ALLEGRO_UUID_PATTERN = /^[0-9A-F]{32}$/;

type LiveTraceKind = 'orderId' | 'externalId';

type LiveTrace = { traceId: string; kind: LiveTraceKind; value: string };

type LiveMissCache = { expiresAtByKey: Map<string, number> };

type LiveLookup = { trace: LiveTrace; now: Date };

type LiveLookupResult =
	| { status: 'found'; orderId: number }
	| { status: 'missed' }
	| { status: 'disabled' };

type LiveHit = { result: ScoreResult; trace: LiveTrace; orderId: number };

/** Szuka zamówień po kodach zwrotu Allegro (`NZ5J/2026`); klucz mapy to kod w tej samej postaci. */
type ReturnReferenceLookup = (
	references: string[],
) => Promise<Map<string, number>>;

type MatchDependencies = {
	/** Bez tej funkcji tropy `returnReference` nic nie dają. */
	findOrderIdsByReturnReference?: ReturnReferenceLookup;
};

type MatchOutcome = {
	result: ScoreResult;
	/** Ile razy zapytano BaseLinker na żywo (bez wywołań pominiętych z braku tokenu). */
	liveLookupCount: number;
};

const liveMissCache = getProcessSingleton<LiveMissCache>(
	'returns.live-miss-cache',
	() => ({ expiresAtByKey: new Map() }),
);

const liveLabelByKind: Record<LiveTraceKind, string> = {
	orderId: 'numer zamówienia',
	externalId: 'ID zewnętrzne',
};

/**
 * Punktuje tropy na indeksie zamówień w pamięci.
 *
 * @remarks
 * Gdy punktacja nic nie daje, a jest w pełni odczytany numer zamówienia albo ID zewnętrzne spoza indeksu,
 * pyta BaseLinkera na żywo (najwyżej 2 wywołania, numery zamówień pierwsze). Trafienie dopisuje do indeksu
 * i zwraca jako `candidates` (zawsze wymaga dotknięcia pracownika, bo źródło tropu nie jest znane). Klucze bez wyniku nie są ponawiane przez 10 minut. Bez tokenu krok jest pomijany.
 *
 * Kody zwrotu z tropów `returnReference` rozwiązuje jednym wywołaniem `findOrderIdsByReturnReference`
 * (tylko gdy takie tropy są); zamówienie spoza indeksu nie dostaje punktów.
 */
async function matchOrdersByTraces(
	traces: TraceQuery[],
	now: Date,
	{ findOrderIdsByReturnReference }: MatchDependencies = {},
): Promise<MatchOutcome> {
	const [orders, orderIdByReturnReference] = await Promise.all([
		getIndexedOrders(now),
		findReturnReferenceOrders(traces, findOrderIdsByReturnReference),
	]);
	const result = scoreOrders(traces, orders, {
		nowMs: now.getTime(),
		orderIdByReturnReference,
	});

	if (result.decision !== 'none') {
		return { result, liveLookupCount: 0 };
	}

	pruneExpiredMisses(now);
	const liveTraces = selectLiveTraces(traces, orders)
		.filter((trace) => !isRecentMiss(trace, now))
		.slice(0, MAX_LIVE_LOOKUPS);

	let liveLookupCount = 0;

	for (const trace of liveTraces) {
		const lookup = await lookUpLiveOrder({ trace, now });

		if (lookup.status === 'disabled') {
			return { result, liveLookupCount };
		}

		liveLookupCount++;

		if (lookup.status === 'found') {
			return {
				result: toLiveHit({ result, trace, orderId: lookup.orderId }),
				liveLookupCount,
			};
		}
	}

	return { result, liveLookupCount };
}

async function findReturnReferenceOrders(
	traces: TraceQuery[],
	findOrderIdsByReturnReference: ReturnReferenceLookup | undefined,
): Promise<Map<string, number>> {
	const references = collectReturnReferences(traces);
	if (!findOrderIdsByReturnReference || references.length === 0) {
		return new Map();
	}
	return findOrderIdsByReturnReference(references);
}

async function lookUpLiveOrder({
	trace,
	now,
}: LiveLookup): Promise<LiveLookupResult> {
	const remote = await findLiveOrder(trace);

	if (remote.status === 'disabled') {
		return { status: 'disabled' };
	}

	if (remote.status === 'error') {
		return { status: 'missed' };
	}

	if (!remote.data) {
		liveMissCache.expiresAtByKey.set(
			toMissKey(trace),
			now.getTime() + LIVE_MISS_TTL_MILLISECONDS,
		);
		return { status: 'missed' };
	}

	await upsertIndexedOrders({ entries: [remote.data], syncedAt: now });
	invalidateIndexedOrders();
	return { status: 'found', orderId: remote.data.order.orderId };
}

function findLiveOrder(
	trace: LiveTrace,
): Promise<RemoteResult<OrderIndexEntry | null>> {
	return trace.kind === 'orderId'
		? findRemoteOrderById(Number(trace.value))
		: findRemoteOrderByExternalId(toApiExternalId(trace.value));
}

function toLiveHit({ result, trace, orderId }: LiveHit): ScoreResult {
	const bits = result.threshold;

	return {
		...result,
		decision: 'candidates',
		candidates: [
			{
				orderId,
				bits,
				reasons: [
					{
						traceId: trace.traceId,
						kind: trace.kind,
						bits,
						label: `${liveLabelByKind[trace.kind]} ${trace.value} (BaseLinker na żywo)`,
					},
				],
			},
		],
	};
}

/**
 * Tropy numeru zamówienia i ID zewnętrznego z w pełni znanym wzorcem, których nie ma w indeksie.
 * Numery zamówień pierwsze, bez powtórzeń.
 */
function selectLiveTraces(
	traces: TraceQuery[],
	orders: IndexedOrder[],
): LiveTrace[] {
	const knownOrderIds = new Set(orders.map((order) => String(order.orderId)));
	const knownExternalIds = new Set(
		orders.map((order) => order.externalOrderId).filter(Boolean),
	);
	const liveTraces: LiveTrace[] = [];

	for (const trace of traces) {
		if (trace.kind !== 'orderId' && trace.kind !== 'externalId') {
			continue;
		}

		const isFullyRead =
			trace.pattern.length > 0 &&
			trace.pattern.every((slot) => slot.length === 1);
		const value = normalizeCode(trace.pattern.join(''));
		const isKnown =
			trace.kind === 'orderId'
				? knownOrderIds.has(value)
				: knownExternalIds.has(value);
		const isDuplicate = liveTraces.some(
			(other) => other.kind === trace.kind && other.value === value,
		);

		if (
			isFullyRead &&
			!isKnown &&
			!isDuplicate &&
			isValidLiveValue(trace.kind, value)
		) {
			liveTraces.push({ traceId: trace.id, kind: trace.kind, value });
		}
	}

	return liveTraces.sort(
		(left, right) =>
			Number(right.kind === 'orderId') - Number(left.kind === 'orderId'),
	);
}

function isValidLiveValue(kind: LiveTraceKind, value: string): boolean {
	if (kind === 'externalId') {
		return EXTERNAL_ID_PATTERN.test(value);
	}

	const { orderIdLength, orderIdPrefix } = defaultShopMatchingConfig;

	return (
		/^\d+$/.test(value) &&
		value.length === orderIdLength &&
		value.startsWith(orderIdPrefix)
	);
}

/**
 * Allegro trzyma ID zewnętrzne jako UUID z myślnikami, małymi literami; etykieta ma 32 znaki bez myślników.
 */
function toApiExternalId(value: string): string {
	const lowerValue = value.toLowerCase();

	if (!ALLEGRO_UUID_PATTERN.test(value)) {
		return lowerValue;
	}

	return [
		lowerValue.slice(0, 8),
		lowerValue.slice(8, 12),
		lowerValue.slice(12, 16),
		lowerValue.slice(16, 20),
		lowerValue.slice(20),
	].join('-');
}

function isRecentMiss(trace: LiveTrace, now: Date): boolean {
	return (
		(liveMissCache.expiresAtByKey.get(toMissKey(trace)) ?? 0) > now.getTime()
	);
}

function pruneExpiredMisses(now: Date): void {
	for (const [key, expiresAt] of liveMissCache.expiresAtByKey) {
		if (expiresAt <= now.getTime()) {
			liveMissCache.expiresAtByKey.delete(key);
		}
	}
}

function toMissKey(trace: LiveTrace): string {
	return `${trace.kind}:${trace.value}`;
}

export {
	type MatchDependencies,
	matchOrdersByTraces,
	type ReturnReferenceLookup,
};
