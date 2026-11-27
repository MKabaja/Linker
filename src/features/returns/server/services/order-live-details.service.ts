import 'server-only';
import type {
	OrderLiveDetails,
	OrderLiveDetailsResult,
} from '@/features/returns/model/order-live.types';
import {
	findRemoteOrderCustomer,
	findRemotePickPackEvents,
	findRemoteShipping,
} from '@/features/returns/server/repositories/remote-orders.repository';
import {
	findPacking,
	findShipmentDate,
} from '@/features/returns/utils/order-shipping';
import { getProcessSingleton } from '@/shared/lib/process-singleton';

const LIVE_DETAILS_TTL_MILLISECONDS = 10 * 60_000;

type LiveDetailsCache = Map<
	number,
	{ details: OrderLiveDetails; expiresAt: number }
>;

const liveDetailsCache = getProcessSingleton<LiveDetailsCache>(
	'returns.order-live-details',
	() => new Map(),
);

/**
 * Zwraca dane klienta i wysyłki zamówienia pobrane na żywo z BaseLinkera (zamówienie, historia pakowania, przesyłki).
 *
 * @remarks
 * Udany wynik jest pamiętany w procesie przez 10 minut, błędu nie pamięta. Bez tokenu daje `disabled`,
 * a błąd API lub brak zamówienia w BaseLinkerze `error` z komunikatem (bez wyjątku).
 */
async function getOrderLiveDetails(
	orderId: number,
	now: Date,
): Promise<OrderLiveDetailsResult> {
	const cached = findCachedDetails(orderId, now);

	if (cached) {
		return { status: 'ok', details: cached };
	}

	const [customerResult, pickPackResult, shippingResult] = await Promise.all([
		findRemoteOrderCustomer(orderId),
		findRemotePickPackEvents(orderId),
		findRemoteShipping(orderId),
	]);

	if (
		customerResult.status === 'disabled' ||
		pickPackResult.status === 'disabled' ||
		shippingResult.status === 'disabled'
	) {
		return { status: 'disabled' };
	}

	if (customerResult.status === 'error') {
		return { status: 'error', message: customerResult.message };
	}

	if (pickPackResult.status === 'error') {
		return { status: 'error', message: pickPackResult.message };
	}

	if (shippingResult.status === 'error') {
		return { status: 'error', message: shippingResult.message };
	}

	if (!customerResult.data) {
		return {
			status: 'error',
			message: 'BaseLinker nie zwrócił tego zamówienia.',
		};
	}

	const details: OrderLiveDetails = {
		customer: customerResult.data,
		shipping: {
			packageCount: shippingResult.data.packageCount,
			packing: findPacking(pickPackResult.data),
			shipmentDate: findShipmentDate(shippingResult.data.trackingEvents),
		},
	};

	liveDetailsCache.set(orderId, {
		details,
		expiresAt: now.getTime() + LIVE_DETAILS_TTL_MILLISECONDS,
	});

	return { status: 'ok', details };
}

function findCachedDetails(
	orderId: number,
	now: Date,
): OrderLiveDetails | null {
	const cached = liveDetailsCache.get(orderId);

	if (!cached) {
		return null;
	}

	if (now.getTime() >= cached.expiresAt) {
		liveDetailsCache.delete(orderId);
		return null;
	}

	return cached.details;
}

export { getOrderLiveDetails };
