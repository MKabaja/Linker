import 'server-only';
import type { OrderReturnsSyncSummary } from '@/features/returns/model/order-returns.types';
import { invalidateIndexedOrders } from '@/features/returns/server/repositories/indexed-orders.cache';
import { upsertOrderReturns } from '@/features/returns/server/repositories/order-returns.repository';
import { findRemoteOrderReturns } from '@/features/returns/server/repositories/remote-orders.repository';
import {
	findSyncValue,
	saveSyncValue,
} from '@/features/returns/server/repositories/sync-state.repository';
import type { OrderReturnsQuery } from '@/features/returns/server/sources/baselinker.client';
import { getProcessSingleton } from '@/shared/lib/process-singleton';
import { isSyncAvailable } from './order-index-sync.service';

const SECONDS_PER_DAY = 86_400;
const MILLISECONDS_PER_SECOND = 1000;
const SYNC_WINDOW_DAYS = 45;
const RESYNC_OVERLAP_DAYS = 7;
const RETURNS_PAGE_SIZE = 100;
const MAX_PAGES_PER_RUN = 20;
const MIN_RUN_INTERVAL_MILLISECONDS = 30 * 60_000;
const RETURNS_SYNCED_AT_KEY = 'order_returns_synced_at';

type ReturnsLocks = { isRunning: boolean };

const returnsLocks = getProcessSingleton<ReturnsLocks>(
	'returns.order-returns-lock',
	() => ({ isRunning: false }),
);

/**
 * Synchronizuje zwroty z modułu zwrotów BaseLinkera (`getOrderReturns`) do `indexed_order_returns` (upsert po `return_id`).
 *
 * @remarks
 * Pierwszy przebieg pobiera 45 dni wstecz, kolejne zaczynają 7 dni przed poprzednim udanym przebiegiem
 * (numer paczki bywa dopisany do zwrotu później), najwyżej co 30 minut. Kolejne strony idą po `id_from`
 * (zakłada rosnące ID w odpowiedzi). Czas przebiegu jest zapisywany dopiero po sukcesie.
 */
async function syncOrderReturns(now: Date): Promise<OrderReturnsSyncSummary> {
	if (!isSyncAvailable()) {
		return { status: 'disabled' };
	}

	if (returnsLocks.isRunning) {
		return { status: 'busy' };
	}

	const lastSyncedAt = parseSyncedAt(
		await findSyncValue(RETURNS_SYNCED_AT_KEY),
	);

	if (isRunTooSoon({ lastSyncedAt, now })) {
		return { status: 'throttled' };
	}

	returnsLocks.isRunning = true;

	try {
		return await syncReturnPages({ now, lastSyncedAt });
	} finally {
		returnsLocks.isRunning = false;
		invalidateIndexedOrders();
	}
}

type SyncPagesInput = { now: Date; lastSyncedAt: number | null };

async function syncReturnPages({
	now,
	lastSyncedAt,
}: SyncPagesInput): Promise<OrderReturnsSyncSummary> {
	let query: OrderReturnsQuery = {
		date_from: calculateStartSeconds({ now, lastSyncedAt }),
	};
	let fetchedReturns = 0;
	let pages = 0;

	while (pages < MAX_PAGES_PER_RUN) {
		const result = await findRemoteOrderReturns(query);

		if (result.status !== 'ok') {
			return result.status === 'disabled'
				? result
				: { status: 'error', message: `${result.code}: ${result.message}` };
		}

		const records = result.data;
		await upsertOrderReturns({ records, syncedAt: now });
		fetchedReturns += records.length;
		pages += 1;

		const nextIdFrom =
			Math.max(0, ...records.map(({ returnId }) => returnId)) + 1;

		if (records.length < RETURNS_PAGE_SIZE) {
			break;
		}

		query = { id_from: nextIdFrom };
	}

	await saveSyncValue(RETURNS_SYNCED_AT_KEY, now.toISOString());

	return { status: 'ok', fetchedReturns, pages };
}

function calculateStartSeconds({ now, lastSyncedAt }: SyncPagesInput): number {
	const nowSeconds = Math.floor(now.getTime() / MILLISECONDS_PER_SECOND);
	const windowStartSeconds = nowSeconds - SYNC_WINDOW_DAYS * SECONDS_PER_DAY;

	if (lastSyncedAt === null) {
		return windowStartSeconds;
	}

	const overlapStartSeconds =
		Math.floor(lastSyncedAt / MILLISECONDS_PER_SECOND) -
		RESYNC_OVERLAP_DAYS * SECONDS_PER_DAY;

	return Math.max(windowStartSeconds, overlapStartSeconds);
}

function isRunTooSoon({ lastSyncedAt, now }: SyncPagesInput): boolean {
	return (
		lastSyncedAt !== null &&
		now.getTime() - lastSyncedAt < MIN_RUN_INTERVAL_MILLISECONDS
	);
}

function parseSyncedAt(savedValue: string | null): number | null {
	const syncedAt = Date.parse(savedValue ?? '');

	return Number.isFinite(syncedAt) ? syncedAt : null;
}

export { syncOrderReturns };
