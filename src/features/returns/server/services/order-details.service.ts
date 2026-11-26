import 'server-only';
import type { OrderIndexEntry } from '@/features/returns/model/order-index.types';
import type {
	OrderDetails,
	OrderDetailsResult,
} from '@/features/returns/model/returns.types';
import { invalidateIndexedOrders } from '@/features/returns/server/repositories/indexed-orders.cache';
import {
	findIndexedOrderEntry,
	upsertIndexedOrders,
} from '@/features/returns/server/repositories/order-index.repository';
import {
	findOrderStatusNames,
	findRemoteOrderById,
} from '@/features/returns/server/repositories/remote-orders.repository';
import { getProcessSingleton } from '@/shared/lib/process-singleton';

const REMOTE_ENTRY_TTL_MILLISECONDS = 10 * 60_000;

type RemoteEntryCache = Map<
	number,
	{ entry: OrderIndexEntry; expiresAt: number }
>;

type EntryLookup =
	| { status: 'found'; entry: OrderIndexEntry }
	| Exclude<OrderDetailsResult, { status: 'found' }>;

const remoteEntryCache = getProcessSingleton<RemoteEntryCache>(
	'returns.remote-order-entries',
	() => new Map(),
);

/**
 * Zwraca zamówienie do ekranu zwrotu: dane z indeksu, pozycje i wszystkie znane przesyłki.
 *
 * @remarks
 * Zamówienia spoza indeksu szuka w BaseLinkerze i dopisuje do indeksu; bez tokenu daje wtedy `notFound`.
 * Znalezione tak zamówienie jest pamiętane w procesie przez 10 minut, bo retencja usuwa je z indeksu, a każde wejście inaczej wołałoby BaseLinker.
 * Nazwa statusu pochodzi z `getOrderStatusList` (pamiętana w procesie), a bez tokenu jest nią identyfikator.
 */
export async function getOrderDetails(
	orderId: number,
	now: Date,
): Promise<OrderDetailsResult> {
	const lookup = await findOrderEntry(orderId, now);

	if (lookup.status !== 'found') {
		return lookup;
	}

	const statusNameById = await findOrderStatusNames(now);
	const statusName = statusNameById?.get(lookup.entry.order.statusId);

	return { status: 'found', order: toOrderDetails(lookup.entry, statusName) };
}

async function findOrderEntry(
	orderId: number,
	now: Date,
): Promise<EntryLookup> {
	const indexedEntry = await findIndexedOrderEntry(orderId);

	if (indexedEntry) {
		return { status: 'found', entry: indexedEntry };
	}

	const cachedEntry = findCachedRemoteEntry(orderId, now);

	if (cachedEntry) {
		return { status: 'found', entry: cachedEntry };
	}

	const remote = await findRemoteOrderById(orderId);

	if (remote.status === 'error') {
		return { status: 'error', message: remote.message };
	}

	if (remote.status === 'disabled' || !remote.data) {
		return { status: 'notFound' };
	}

	remoteEntryCache.set(orderId, {
		entry: remote.data,
		expiresAt: now.getTime() + REMOTE_ENTRY_TTL_MILLISECONDS,
	});
	await upsertIndexedOrders({ entries: [remote.data], syncedAt: now });
	invalidateIndexedOrders();
	return { status: 'found', entry: remote.data };
}

function findCachedRemoteEntry(
	orderId: number,
	now: Date,
): OrderIndexEntry | null {
	const cached = remoteEntryCache.get(orderId);

	if (!cached) {
		return null;
	}

	if (now.getTime() >= cached.expiresAt) {
		remoteEntryCache.delete(orderId);
		return null;
	}

	return cached.entry;
}

function toOrderDetails(
	{ order, items, packages }: OrderIndexEntry,
	statusName: string | undefined,
): OrderDetails {
	return {
		orderId: order.orderId,
		externalOrderId: order.externalOrderId,
		source: order.source,
		statusId: order.statusId,
		statusName: statusName || String(order.statusId),
		dateAdd: order.dateAdd,
		dateConfirmed: order.dateConfirmed,
		items: items.map(
			({ position, orderProductId, name, ean, sku, quantity }) => ({
				position,
				orderProductId,
				name,
				ean,
				sku,
				quantity,
			}),
		),
		packages: packages.map(({ courierCode, packageNumber, innerNumber }) => ({
			courierCode,
			packageNumber,
			innerNumber,
		})),
	};
}
