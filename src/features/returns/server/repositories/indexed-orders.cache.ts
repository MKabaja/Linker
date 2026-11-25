import 'server-only';
import type { IndexedOrder } from '@/features/returns/model/order-scoring.types';
import { getProcessSingleton } from '@/shared/lib/process-singleton';
import { findAllIndexedOrders } from './order-index.repository';

const INDEX_TTL_MILLISECONDS = 2 * 60_000;

type IndexedOrdersCache = {
	orders: IndexedOrder[] | null;
	loadedAt: number;
	/** Rośnie przy każdym unieważnieniu; wczytanie rozpoczęte przed nim nie jest uznawane za świeże. */
	generation: number;
	pendingLoad: Promise<IndexedOrder[]> | null;
};

const indexedOrdersCache = getProcessSingleton<IndexedOrdersCache>(
	'returns.indexed-orders',
	() => ({ orders: null, loadedAt: 0, generation: 0, pendingLoad: null }),
);

/**
 * Zwraca indeks zamówień z pamięci procesu, wczytując go z bazy przy pierwszym użyciu,
 * po `invalidateIndexedOrders()` albo po 2 minutach (zmiany z innego procesu, np. skryptu seed).
 *
 * @remarks Równoległe wywołania w trakcie wczytywania czekają na to samo zapytanie. Tablica jest tą samą instancją aż do przeładowania, więc widok punktacji liczy się raz.
 */
function getIndexedOrders(now: Date): Promise<IndexedOrder[]> {
	const { orders, loadedAt } = indexedOrdersCache;

	if (orders && now.getTime() - loadedAt < INDEX_TTL_MILLISECONDS) {
		return Promise.resolve(orders);
	}

	indexedOrdersCache.pendingLoad ??= loadIndexedOrders(now);
	return indexedOrdersCache.pendingLoad;
}

function invalidateIndexedOrders(): void {
	indexedOrdersCache.loadedAt = 0;
	indexedOrdersCache.generation += 1;
}

async function loadIndexedOrders(now: Date): Promise<IndexedOrder[]> {
	const startedGeneration = indexedOrdersCache.generation;

	try {
		const orders = await findAllIndexedOrders();
		const isStillCurrent = startedGeneration === indexedOrdersCache.generation;
		indexedOrdersCache.orders = orders;
		indexedOrdersCache.loadedAt = isStillCurrent ? now.getTime() : 0;
		return orders;
	} finally {
		indexedOrdersCache.pendingLoad = null;
	}
}

export { getIndexedOrders, invalidateIndexedOrders };
