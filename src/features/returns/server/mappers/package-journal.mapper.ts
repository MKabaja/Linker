import 'server-only';
import type { BaseLinkerJournalLog } from '@/features/returns/server/sources/baselinker.schemas';

const PACKAGE_CREATED_LOG_TYPE = 9;
const PACKAGE_DELETED_LOG_TYPE = 10;
const FIRST_LOG_ID = 1;

const packageLogTypes = new Set([
	PACKAGE_CREATED_LOG_TYPE,
	PACKAGE_DELETED_LOG_TYPE,
]);

/**
 * Wybiera identyfikatory zamówień, których paczki się zmieniły (utworzenie albo usunięcie), bez powtórzeń,
 * w kolejności pierwszego wystąpienia w dzienniku.
 */
function selectOrderIdsWithPackageChanges(
	logs: BaseLinkerJournalLog[],
): number[] {
	const orderIds = logs
		.filter(
			({ log_type, order_id }) => packageLogTypes.has(log_type) && order_id > 0,
		)
		.map(({ order_id }) => order_id);

	return [...new Set(orderIds)];
}

/**
 * Wybiera zamówienia, dla których dziennik zawiera usunięcie paczki (typ 10).
 */
function selectOrderIdsWithPackageDeletions(
	logs: BaseLinkerJournalLog[],
): Set<number> {
	return new Set(
		logs
			.filter(({ log_type }) => log_type === PACKAGE_DELETED_LOG_TYPE)
			.map(({ order_id }) => order_id),
	);
}

type ReplacePackagesDecision = {
	packageCount: number;
	hasDeletionLog: boolean;
};

/**
 * Pusta lista paczek z API jest wiarygodna tylko wtedy, gdy dziennik potwierdza usunięcie paczki;
 * w pozostałych przypadkach zostają dotychczasowe paczki zamówienia.
 */
function shouldReplacePackages({
	packageCount,
	hasDeletionLog,
}: ReplacePackagesDecision): boolean {
	return packageCount > 0 || hasDeletionLog;
}

/**
 * Zwraca kursor `last_log_id` dla kolejnego wywołania: o jeden większy od największego przetworzonego wpisu
 * (API zwraca wpisy od podanego ID włącznie). Bez wpisów zostaje dotychczasowy kursor.
 */
function getNextJournalCursor(
	logs: BaseLinkerJournalLog[],
	currentCursor: number,
): number {
	const maxLogId = Math.max(0, ...logs.map(({ log_id }) => log_id));

	return maxLogId > 0 ? Math.max(currentCursor, maxLogId + 1) : currentCursor;
}

/**
 * Odczytuje zapisany kursor; brak lub niepoprawna wartość oznacza początek dziennika (API odrzuca 0).
 */
function parseJournalCursor(savedValue: string | null): number {
	const cursor = Number(savedValue);

	return Number.isInteger(cursor) && cursor > 0 ? cursor : FIRST_LOG_ID;
}

export {
	getNextJournalCursor,
	parseJournalCursor,
	selectOrderIdsWithPackageChanges,
	selectOrderIdsWithPackageDeletions,
	shouldReplacePackages,
};
