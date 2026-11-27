import 'server-only';
import type { PendingReturnView } from '@/features/returns/model/typed-number.types';
import { toPendingReturnView } from '@/features/returns/server/mappers/pending-return.mapper';
import { findPendingReturns } from '@/features/returns/server/repositories/order-returns.repository';

const PENDING_WINDOW_DAYS = 45;
const MAX_PENDING_RETURNS = 100;
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Zwraca zwroty z modułu zwrotów BaseLinkera z ostatnich 45 dni, dla których nie przyjęto jeszcze zwrotu
 * (najnowsze pierwsze, najwyżej 100). To wyjście awaryjne, gdy skan nic nie znalazł.
 */
async function getPendingReturns(now: Date): Promise<PendingReturnView[]> {
	const since = new Date(
		now.getTime() - PENDING_WINDOW_DAYS * MILLISECONDS_PER_DAY,
	);
	const pendingReturns = await findPendingReturns({ since });

	return pendingReturns.slice(0, MAX_PENDING_RETURNS).map(toPendingReturnView);
}

export { getPendingReturns };
