import 'server-only';
import type { ReturnsEventContext } from '@/features/returns/model/event-log.types';
import type { SearchResponse } from '@/features/returns/model/order-search.types';
import type { TraceQuery } from '@/features/returns/model/traces.types';
import { findExistingReturnsByOrderIds } from '@/features/returns/server/repositories/returns.repository';
import { logReturnsEvent } from '@/features/returns/server/sources/event-log.source';
import { toTracePatternLabel } from '@/features/returns/utils/trace-pattern-label';
import { matchOrdersByTraces } from './order-matcher.service';

const MAX_LOGGED_CANDIDATES = 3;

type SearchRequest = {
	traces: TraceQuery[];
	now: Date;
	logContext: ReturnsEventContext;
};

/**
 * Dopasowuje zamówienia do tropów i oznacza kandydatów, dla których zwrot już przyjęto.
 *
 * @remarks
 * Zwroty kandydatów pobiera jednym zapytaniem do bazy. Wynik trafia do dziennika zdarzeń (`search`) bez czekania na zapis.
 */
export async function searchOrders({
	traces,
	now,
	logContext,
}: SearchRequest): Promise<SearchResponse> {
	const startedAt = performance.now();
	const { result, liveLookupCount } = await matchOrdersByTraces(traces, now);
	const existingReturnByOrderId = await findExistingReturnsByOrderIds(
		result.candidates.map((candidate) => candidate.orderId),
	);

	logReturnsEvent({
		...logContext,
		type: 'search',
		traceCount: traces.length,
		traces: traces.map((trace) => ({
			kind: trace.kind,
			pattern: toTracePatternLabel(trace),
		})),
		decision: result.decision,
		threshold: result.threshold,
		topCandidates: result.candidates
			.slice(0, MAX_LOGGED_CANDIDATES)
			.map(({ orderId, bits, reasons }) => ({
				orderId,
				bits,
				reasons: reasons.map(({ traceId, kind, bits: reasonBits }) => ({
					traceId,
					kind,
					bits: reasonBits,
				})),
			})),
		liveLookupCount,
		durationMs: Math.round(performance.now() - startedAt),
		indexSize: result.indexSize,
	});

	return {
		...result,
		candidates: result.candidates.map((candidate) => ({
			...candidate,
			existingReturn: existingReturnByOrderId.get(candidate.orderId) ?? null,
		})),
	};
}
