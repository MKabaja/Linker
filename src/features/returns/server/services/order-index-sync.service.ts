import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import type {
	PackagesSyncSummary,
	SyncSummary,
} from '@/features/returns/model/order-index.types';
import { invalidateIndexedOrders } from '@/features/returns/server/repositories/indexed-orders.cache';
import {
	countOrdersPendingPackages,
	deleteOrdersBefore,
	findOrderIdsPendingPackages,
	replaceOrderPackages,
	upsertIndexedOrders,
} from '@/features/returns/server/repositories/order-index.repository';
import {
	findRemoteOrderPackages,
	findRemoteOrdersConfirmedFrom,
} from '@/features/returns/server/repositories/remote-orders.repository';
import {
	findSyncValue,
	saveSyncValue,
} from '@/features/returns/server/repositories/sync-state.repository';
import { isBaseLinkerEnabled } from '@/features/returns/server/sources/baselinker.config';
import { getReturnsConfig } from '@/features/returns/server/sources/returns.config';
import { getProcessSingleton } from '@/shared/lib/process-singleton';

const SECONDS_PER_DAY = 86_400;
const MILLISECONDS_PER_SECOND = 1000;
const SYNC_WINDOW_DAYS = 45;
const RESYNC_OVERLAP_DAYS = 3;
const ORDERS_PAGE_SIZE = 100;
const MAX_ORDER_PAGES_PER_RUN = 200;
const PACKAGE_CALLS_PER_RUN = 80;
const PACKAGES_RECHECK_MILLISECONDS = 2 * 60 * 60_000;
const PACKAGES_RECHECK_DAYS = 10;
const RELOAD_INDEX_EVERY_PACKAGES = 20;
const ORDERS_CURSOR_KEY = 'orders_date_confirmed';
const ORDERS_SYNCED_AT_KEY = 'orders_synced_at';

type SyncLocks = {
	isOrdersSyncRunning: boolean;
	isPackagesSyncRunning: boolean;
};

const syncLocks = getProcessSingleton<SyncLocks>('returns.sync-locks', () => ({
	isOrdersSyncRunning: false,
	isPackagesSyncRunning: false,
}));

/**
 * Sprawdza nagłówek `Authorization: Bearer <SYNC_SECRET>` w stałym czasie.
 *
 * @remarks Bez ustawionego `SYNC_SECRET` zawsze zwraca `false`.
 */
function isAuthorizedSyncRequest(authorization: string | null): boolean {
	const { syncSecret } = getReturnsConfig();

	if (!syncSecret || !authorization) {
		return false;
	}

	return isSameSecret(authorization, `Bearer ${syncSecret}`);
}

/**
 * Synchronizuje indeks zamówień z BaseLinkera: strony `getOrders` od kursora `date_confirmed_from`
 * (z zakładką 3 dni, upsert po `order_id`), potem retencja 45 dni.
 *
 * @remarks
 * Zwraca `disabled`, gdy `RETURNS_SYNC_ENABLED` nie jest `true` albo brak tokenu, i `busy`, gdy synchronizacja już trwa w tym procesie.
 * Kursor jest zapisywany po każdej stronie, więc przerwana synchronizacja nie zaczyna od nowa.
 */
async function syncOrderIndex(now: Date): Promise<SyncSummary> {
	if (!isSyncAvailable()) {
		return { status: 'disabled' };
	}

	if (syncLocks.isOrdersSyncRunning) {
		return { status: 'busy' };
	}

	syncLocks.isOrdersSyncRunning = true;

	try {
		return await syncOrderPages(now);
	} finally {
		syncLocks.isOrdersSyncRunning = false;
		invalidateIndexedOrders();
	}
}

/**
 * Pobiera przesyłki (`getOrderPackages`) dla najwyżej 80 zamówień: niesprawdzonych oraz świeżych (do 10 dni)
 * bez przesyłki, sprawdzonych ponad 2 godziny temu. Najnowsze zamówienia pierwsze.
 *
 * @remarks Pierwszy błąd API kończy porcję; reszta zostanie pobrana w kolejnym uruchomieniu.
 */
async function syncPendingPackages(now: Date): Promise<PackagesSyncSummary> {
	if (!isSyncAvailable()) {
		return { status: 'disabled' };
	}

	if (syncLocks.isPackagesSyncRunning) {
		return { status: 'busy' };
	}

	syncLocks.isPackagesSyncRunning = true;

	try {
		return await syncPackagesBatch(now);
	} finally {
		syncLocks.isPackagesSyncRunning = false;
		invalidateIndexedOrders();
	}
}

async function syncOrderPages(now: Date): Promise<SyncSummary> {
	const nowSeconds = toUnixSeconds(now);
	const windowStartSeconds = nowSeconds - SYNC_WINDOW_DAYS * SECONDS_PER_DAY;
	let cursorSeconds = await readStartCursor(nowSeconds, windowStartSeconds);
	let fetchedOrders = 0;
	let pages = 0;

	while (pages < MAX_ORDER_PAGES_PER_RUN) {
		const result = await findRemoteOrdersConfirmedFrom(
			fromUnixSeconds(cursorSeconds),
		);

		if (result.status !== 'ok') {
			return result.status === 'disabled'
				? result
				: { status: 'error', message: `${result.code}: ${result.message}` };
		}

		const entries = result.data;
		await upsertIndexedOrders({ entries, syncedAt: now });
		pages += 1;
		fetchedOrders += entries.length;

		const maxConfirmedSeconds = Math.max(
			cursorSeconds,
			...entries.map(({ order }) =>
				order.dateConfirmed ? toUnixSeconds(order.dateConfirmed) : 0,
			),
		);
		await saveSyncValue(ORDERS_CURSOR_KEY, String(maxConfirmedSeconds));

		if (entries.length < ORDERS_PAGE_SIZE) {
			break;
		}

		cursorSeconds =
			maxConfirmedSeconds > cursorSeconds
				? maxConfirmedSeconds
				: cursorSeconds + 1;
	}

	const removedOrders = await deleteOrdersBefore(
		fromUnixSeconds(windowStartSeconds),
	);
	await saveSyncValue(ORDERS_SYNCED_AT_KEY, now.toISOString());

	return {
		status: 'ok',
		fetchedOrders,
		pages,
		removedOrders,
		pendingPackages: await countOrdersPendingPackages(),
	};
}

async function readStartCursor(
	nowSeconds: number,
	windowStartSeconds: number,
): Promise<number> {
	const savedCursorSeconds = Number(await findSyncValue(ORDERS_CURSOR_KEY));
	const overlapStartSeconds =
		nowSeconds - RESYNC_OVERLAP_DAYS * SECONDS_PER_DAY;
	const resumeSeconds =
		Number.isFinite(savedCursorSeconds) && savedCursorSeconds > 0
			? Math.min(savedCursorSeconds, overlapStartSeconds)
			: windowStartSeconds;

	return Math.max(windowStartSeconds, resumeSeconds);
}

async function syncPackagesBatch(now: Date): Promise<PackagesSyncSummary> {
	const orderIds = await findOrderIdsPendingPackages({
		limit: PACKAGE_CALLS_PER_RUN,
		recheckCheckedBefore: new Date(
			now.getTime() - PACKAGES_RECHECK_MILLISECONDS,
		),
		recheckConfirmedFrom: new Date(
			now.getTime() -
				PACKAGES_RECHECK_DAYS * SECONDS_PER_DAY * MILLISECONDS_PER_SECOND,
		),
	});
	let checkedOrders = 0;

	for (const orderId of orderIds) {
		const result = await findRemoteOrderPackages(orderId);

		if (result.status === 'disabled') {
			return result;
		}

		if (result.status === 'error') {
			return {
				status: 'error',
				checkedOrders,
				message: `${result.code}: ${result.message}`,
			};
		}

		await replaceOrderPackages({
			orderId,
			packages: result.data,
			checkedAt: now,
		});
		checkedOrders += 1;

		if (checkedOrders % RELOAD_INDEX_EVERY_PACKAGES === 0) {
			invalidateIndexedOrders();
		}
	}

	return {
		status: 'ok',
		checkedOrders,
		pendingPackages: await countOrdersPendingPackages(),
	};
}

function isSyncAvailable(): boolean {
	return getReturnsConfig().isSyncEnabled && isBaseLinkerEnabled();
}

function isSameSecret(received: string, expected: string): boolean {
	return timingSafeEqual(sha256(received), sha256(expected));
}

function sha256(value: string): Buffer {
	return createHash('sha256').update(value).digest();
}

function toUnixSeconds(date: Date): number {
	return Math.floor(date.getTime() / MILLISECONDS_PER_SECOND);
}

function fromUnixSeconds(seconds: number): Date {
	return new Date(seconds * MILLISECONDS_PER_SECOND);
}

export { isAuthorizedSyncRequest, syncOrderIndex, syncPendingPackages };
