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

type EntryLookup =
	| { status: 'found'; entry: OrderIndexEntry }
	| Exclude<OrderDetailsResult, { status: 'found' }>;

/**
 * Zwraca zamówienie do ekranu zwrotu: dane z indeksu, pozycje i wszystkie znane przesyłki.
 *
 * @remarks
 * Zamówienia spoza indeksu szuka w BaseLinkerze i dopisuje do indeksu; bez tokenu daje wtedy `notFound`.
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

	const remote = await findRemoteOrderById(orderId);

	if (remote.status === 'error') {
		return { status: 'error', message: remote.message };
	}

	if (remote.status === 'disabled' || !remote.data) {
		return { status: 'notFound' };
	}

	await upsertIndexedOrders({ entries: [remote.data], syncedAt: now });
	invalidateIndexedOrders();
	return { status: 'found', entry: remote.data };
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
