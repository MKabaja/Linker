import 'server-only';
import type { PackageJournalSyncSummary } from '@/features/returns/model/order-returns.types';
import {
	getNextJournalCursor,
	parseJournalCursor,
	selectOrderIdsWithPackageChanges,
	selectOrderIdsWithPackageDeletions,
	shouldReplacePackages,
} from '@/features/returns/server/mappers/package-journal.mapper';
import { invalidateIndexedOrders } from '@/features/returns/server/repositories/indexed-orders.cache';
import {
	findIndexedOrderIds,
	replaceOrderPackages,
} from '@/features/returns/server/repositories/order-index.repository';
import {
	findRemoteOrderPackages,
	findRemotePackageJournal,
} from '@/features/returns/server/repositories/remote-orders.repository';
import {
	findSyncValue,
	saveSyncValue,
} from '@/features/returns/server/repositories/sync-state.repository';
import { getProcessSingleton } from '@/shared/lib/process-singleton';
import { isSyncAvailable } from './order-index-sync.service';

const JOURNAL_PAGE_SIZE = 1000;
const MAX_JOURNAL_PAGES_PER_RUN = 3;
const MIN_RUN_INTERVAL_MILLISECONDS = 5 * 60_000;
const JOURNAL_CURSOR_KEY = 'package_journal_last_log_id';
const JOURNAL_SYNCED_AT_KEY = 'package_journal_synced_at';

type JournalLocks = { isRunning: boolean };

const journalLocks = getProcessSingleton<JournalLocks>(
	'returns.package-journal-lock',
	() => ({ isRunning: false }),
);

/**
 * Odświeża paczki zamówień z indeksu na podstawie dziennika BaseLinkera (tworzenie i usuwanie paczek):
 * dla każdego zamówienia z indeksu występującego w dzienniku pobiera `getOrderPackages` i zastępuje jego paczki.
 * Zamówień spoza indeksu nie rusza.
 *
 * @remarks
 * Kursor `last_log_id` leży w `sync_state` i przesuwa się dopiero po obsłużeniu całej strony, więc błąd API
 * powtarza stronę w kolejnej rundzie. Najwyżej 3 strony (po 1000 wpisów) na uruchomienie, najczęściej co 5 minut.
 */
async function syncPackagesFromJournal(
	now: Date,
): Promise<PackageJournalSyncSummary> {
	if (!isSyncAvailable()) {
		return { status: 'disabled' };
	}

	if (journalLocks.isRunning) {
		return { status: 'busy' };
	}

	if (await isRunTooSoon(now)) {
		return { status: 'throttled' };
	}

	journalLocks.isRunning = true;

	try {
		return await syncJournalPages(now);
	} finally {
		journalLocks.isRunning = false;
		invalidateIndexedOrders();
	}
}

async function syncJournalPages(now: Date): Promise<PackageJournalSyncSummary> {
	let cursor = parseJournalCursor(await findSyncValue(JOURNAL_CURSOR_KEY));
	let refreshedOrders = 0;
	let pages = 0;

	while (pages < MAX_JOURNAL_PAGES_PER_RUN) {
		const journalResult = await findRemotePackageJournal(cursor);

		if (journalResult.status !== 'ok') {
			return journalResult.status === 'disabled'
				? journalResult
				: {
						status: 'error',
						refreshedOrders,
						message: `${journalResult.code}: ${journalResult.message}`,
					};
		}

		const logs = journalResult.data;
		const indexedOrderIds = await findIndexedOrderIds(
			selectOrderIdsWithPackageChanges(logs),
		);

		const deletedOrderIds = selectOrderIdsWithPackageDeletions(logs);

		for (const orderId of indexedOrderIds) {
			const packagesResult = await findRemoteOrderPackages(orderId);

			if (packagesResult.status !== 'ok') {
				return packagesResult.status === 'disabled'
					? packagesResult
					: {
							status: 'error',
							refreshedOrders,
							message: `${packagesResult.code}: ${packagesResult.message}`,
						};
			}

			const isReplacing = shouldReplacePackages({
				packageCount: packagesResult.data.length,
				hasDeletionLog: deletedOrderIds.has(orderId),
			});

			if (!isReplacing) {
				continue;
			}

			await replaceOrderPackages({
				orderId,
				packages: packagesResult.data,
				checkedAt: now,
			});
			refreshedOrders += 1;
		}

		cursor = getNextJournalCursor(logs, cursor);
		await saveSyncValue(JOURNAL_CURSOR_KEY, String(cursor));
		pages += 1;

		if (logs.length < JOURNAL_PAGE_SIZE) {
			break;
		}
	}

	await saveSyncValue(JOURNAL_SYNCED_AT_KEY, now.toISOString());

	return { status: 'ok', refreshedOrders, pages };
}

async function isRunTooSoon(now: Date): Promise<boolean> {
	const lastRunAt = Date.parse(
		(await findSyncValue(JOURNAL_SYNCED_AT_KEY)) ?? '',
	);

	return (
		Number.isFinite(lastRunAt) &&
		now.getTime() - lastRunAt < MIN_RUN_INTERVAL_MILLISECONDS
	);
}

export { syncPackagesFromJournal };
