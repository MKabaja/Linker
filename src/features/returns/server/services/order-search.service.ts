import 'server-only';
import type { SearchResponse } from '@/features/returns/model/order-search.types';
import type { TraceQuery } from '@/features/returns/model/traces.types';
import { findExistingReturnsByOrderIds } from '@/features/returns/server/repositories/returns.repository';
import { matchOrdersByTraces } from './order-matcher.service';

/**
 * Dopasowuje zamówienia do tropów i oznacza kandydatów, dla których zwrot już przyjęto.
 *
 * @remarks Zwroty kandydatów pobiera jednym zapytaniem do bazy.
 */
export async function searchOrders(
	traces: TraceQuery[],
	now: Date,
): Promise<SearchResponse> {
	const result = await matchOrdersByTraces(traces, now);
	const existingReturnByOrderId = await findExistingReturnsByOrderIds(
		result.candidates.map((candidate) => candidate.orderId),
	);

	return {
		...result,
		candidates: result.candidates.map((candidate) => ({
			...candidate,
			existingReturn: existingReturnByOrderId.get(candidate.orderId) ?? null,
		})),
	};
}
