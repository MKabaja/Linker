import 'server-only';
import type { OrderIndexEntry } from '@/features/returns/model/order-index.types';
import { SEED_ORDER_SOURCE } from '@/features/returns/model/returns.constants';
import { invalidateIndexedOrders } from '@/features/returns/server/repositories/indexed-orders.cache';
import {
	deleteOrdersBySource,
	markPackagesChecked,
	upsertIndexedOrders,
} from '@/features/returns/server/repositories/order-index.repository';

type SeedSummary = { removedOrders: number; insertedOrders: number };

/**
 * Zastępuje syntetyczne zamówienia w indeksie podanymi wpisami.
 *
 * @remarks
 * Każdy wpis dostaje `order_source = 'seed'` i oznaczone przesyłki, więc synchronizacja nie pyta o nie BaseLinkera.
 * Wpis o `order_id` istniejącego prawdziwego zamówienia nadpisze je, dlatego seed używa zakresu numerów spoza konta.
 */
async function seedOrderIndex(
	entries: OrderIndexEntry[],
	now: Date,
): Promise<SeedSummary> {
	const removedOrders = await deleteOrdersBySource(SEED_ORDER_SOURCE);
	const seedEntries = entries.map((entry) => ({
		...entry,
		order: { ...entry.order, source: SEED_ORDER_SOURCE },
	}));

	await upsertIndexedOrders({ entries: seedEntries, syncedAt: now });
	await markPackagesChecked(
		seedEntries.map(({ order }) => order.orderId),
		now,
	);
	invalidateIndexedOrders();

	return { removedOrders, insertedOrders: seedEntries.length };
}

async function clearSeededOrders(): Promise<number> {
	const removedOrders = await deleteOrdersBySource(SEED_ORDER_SOURCE);
	invalidateIndexedOrders();
	return removedOrders;
}

export { clearSeededOrders, type SeedSummary, seedOrderIndex };
