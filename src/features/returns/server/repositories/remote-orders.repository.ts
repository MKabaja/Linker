import 'server-only';
import type {
	IndexedPackage,
	OrderIndexEntry,
	RemoteResult,
} from '@/features/returns/model/order-index.types';
import type {
	OrderCustomer,
	PickPackEvent,
	TrackingEvent,
} from '@/features/returns/model/order-live.types';
import {
	mapBaseLinkerOrder,
	mapBaseLinkerPackages,
} from '@/features/returns/server/mappers/baselinker-order.mapper';
import { mapBaseLinkerOrderCustomer } from '@/features/returns/server/mappers/order-customer.mapper';
import {
	mapBaseLinkerPickPackEvents,
	mapBaseLinkerTrackingEvents,
} from '@/features/returns/server/mappers/order-shipping.mapper';
import {
	fetchBaseLinkerOrderCustomer,
	fetchBaseLinkerOrderPackages,
	fetchBaseLinkerOrderPickPackHistory,
	fetchBaseLinkerOrderShipments,
	fetchBaseLinkerOrderStatuses,
	fetchBaseLinkerOrders,
	fetchBaseLinkerPackagesStatusHistory,
	type OrdersQuery,
	type StatusEventsByPackageId,
} from '@/features/returns/server/sources/baselinker.client';
import { getProcessSingleton } from '@/shared/lib/process-singleton';

const STATUS_NAMES_TTL_MILLISECONDS = 60 * 60_000;
const STATUS_NAMES_RETRY_MILLISECONDS = 5 * 60_000;
const MILLISECONDS_PER_SECOND = 1000;

type StatusNameById = Map<number, string>;

type RemoteShipping = { packageCount: number; trackingEvents: TrackingEvent[] };

type StatusNamesCache = {
	statusNameById: StatusNameById | null;
	expiresAt: number;
};

const statusNamesCache = getProcessSingleton<StatusNamesCache>(
	'returns.order-status-names',
	() => ({ statusNameById: null, expiresAt: 0 }),
);

/**
 * Pobiera stronę (najwyżej 100) potwierdzonych zamówień od `dateConfirmedFrom` włącznie.
 *
 * @remarks Wywołanie w tle (synchronizacja), więc ustępuje wywołaniom interaktywnym.
 */
async function findRemoteOrdersConfirmedFrom(
	dateConfirmedFrom: Date,
): Promise<RemoteResult<OrderIndexEntry[]>> {
	const result = await fetchBaseLinkerOrders(
		{
			date_confirmed_from: Math.floor(
				dateConfirmedFrom.getTime() / MILLISECONDS_PER_SECOND,
			),
			get_unconfirmed_orders: false,
		},
		{ priority: 'background' },
	);

	return result.status === 'ok'
		? { status: 'ok', data: result.data.map(mapBaseLinkerOrder) }
		: result;
}

function findRemoteOrderById(
	orderId: number,
): Promise<RemoteResult<OrderIndexEntry | null>> {
	return findSingleRemoteOrder({
		order_id: orderId,
		get_unconfirmed_orders: true,
	});
}

/**
 * Szuka zamówienia po ID zewnętrznym w postaci, jaką trzyma BaseLinker (np. UUID Allegro z myślnikami).
 */
function findRemoteOrderByExternalId(
	externalOrderId: string,
): Promise<RemoteResult<OrderIndexEntry | null>> {
	return findSingleRemoteOrder({
		filter_external_order_id: externalOrderId,
		get_unconfirmed_orders: true,
	});
}

async function findRemoteOrderPackages(
	orderId: number,
): Promise<RemoteResult<IndexedPackage[]>> {
	const result = await fetchBaseLinkerOrderPackages(orderId, {
		priority: 'background',
	});

	return result.status === 'ok'
		? { status: 'ok', data: mapBaseLinkerPackages(result.data) }
		: result;
}

/**
 * Pobiera dane klienta zamówienia na żywo.
 *
 * @returns `ok` z `null`, gdy BaseLinker nie zna zamówienia.
 */
async function findRemoteOrderCustomer(
	orderId: number,
): Promise<RemoteResult<OrderCustomer | null>> {
	const result = await fetchBaseLinkerOrderCustomer(orderId);

	if (result.status !== 'ok') {
		return result;
	}

	return {
		status: 'ok',
		data: result.data ? mapBaseLinkerOrderCustomer(result.data) : null,
	};
}

async function findRemotePickPackEvents(
	orderId: number,
): Promise<RemoteResult<PickPackEvent[]>> {
	const result = await fetchBaseLinkerOrderPickPackHistory(orderId);

	return result.status === 'ok'
		? { status: 'ok', data: mapBaseLinkerPickPackEvents(result.data) }
		: result;
}

/**
 * Pobiera liczbę przesyłek wychodzących i zdarzenia ich śledzenia.
 *
 * @remarks Gdy nie uda się pobrać historii statusów, zdarzenia pochodzą tylko z bieżących statusów przesyłek.
 */
async function findRemoteShipping(
	orderId: number,
): Promise<RemoteResult<RemoteShipping>> {
	const shipmentsResult = await fetchBaseLinkerOrderShipments(orderId);

	if (shipmentsResult.status !== 'ok') {
		return shipmentsResult;
	}

	const shipments = shipmentsResult.data.filter(({ is_return }) => !is_return);
	const historyResult =
		shipments.length > 0
			? await fetchBaseLinkerPackagesStatusHistory(
					shipments.map(({ package_id }) => package_id),
				)
			: null;
	const historyByPackageId: StatusEventsByPackageId =
		historyResult?.status === 'ok' ? historyResult.data : new Map();

	return {
		status: 'ok',
		data: {
			packageCount: shipments.length,
			trackingEvents: mapBaseLinkerTrackingEvents({
				shipments,
				historyByPackageId,
			}),
		},
	};
}

/**
 * Zwraca nazwy statusów zamówień albo `null`, gdy integracja jest wyłączona lub API nie odpowiada.
 *
 * @remarks Lista jest pamiętana w procesie przez godzinę, a po błędzie kolejna próba jest najwcześniej po 5 minutach.
 */
async function findOrderStatusNames(now: Date): Promise<StatusNameById | null> {
	if (now.getTime() < statusNamesCache.expiresAt) {
		return statusNamesCache.statusNameById;
	}

	const result = await fetchBaseLinkerOrderStatuses();

	if (result.status === 'ok') {
		statusNamesCache.statusNameById = new Map(
			result.data.map((status) => [status.id, status.name.trim()]),
		);
		statusNamesCache.expiresAt = now.getTime() + STATUS_NAMES_TTL_MILLISECONDS;
	} else {
		statusNamesCache.expiresAt =
			now.getTime() + STATUS_NAMES_RETRY_MILLISECONDS;
	}

	return statusNamesCache.statusNameById;
}

async function findSingleRemoteOrder(
	query: OrdersQuery,
): Promise<RemoteResult<OrderIndexEntry | null>> {
	const result = await fetchBaseLinkerOrders(query);

	if (result.status !== 'ok') {
		return result;
	}

	const [order] = result.data;

	return { status: 'ok', data: order ? mapBaseLinkerOrder(order) : null };
}

export {
	findOrderStatusNames,
	findRemoteOrderByExternalId,
	findRemoteOrderById,
	findRemoteOrderCustomer,
	findRemoteOrderPackages,
	findRemoteOrdersConfirmedFrom,
	findRemotePickPackEvents,
	findRemoteShipping,
	type StatusNameById,
};
