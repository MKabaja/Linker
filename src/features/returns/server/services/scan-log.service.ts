import 'server-only';
import type { ScanLog } from '@/features/returns/model/scan-log.schemas';
import type {
	DebugLogResult,
	ScanStats,
} from '@/features/returns/model/scan-log.types';
import {
	findRecentScanSummaries,
	insertScanLog,
} from '@/features/returns/server/repositories/scan-logs.repository';
import { getReturnsConfig } from '@/features/returns/server/sources/returns.config';
import { summarizeScans } from '@/features/returns/utils/scan-stats';

const STATS_SCAN_LIMIT = 5000;

type ScanLogRequest = { scanLog: ScanLog; userId: number };

type DebugEventsRequest = { events: unknown; userId: number; now: Date };

function saveScanLog({ scanLog, userId }: ScanLogRequest): Promise<void> {
	return insertScanLog({ scanLog, userId });
}

/**
 * Statystyki z najwyżej 5000 ostatnich skanów.
 */
async function getScanStats(): Promise<ScanStats> {
	return summarizeScans(await findRecentScanSummaries(STATS_SCAN_LIMIT));
}

/**
 * Zapisuje w logu serwera zdarzenia diagnostyczne skanera z telefonu (kroki startu aparatu, błędy, zablokowany wątek).
 *
 * @remarks Działa tylko przy `RETURNS_DEBUG_LOG=true`, inaczej zwraca `disabled` i nic nie zapisuje.
 */
function logScannerDebugEvents({
	events,
	userId,
	now,
}: DebugEventsRequest): DebugLogResult {
	if (!getReturnsConfig().isDebugLogEnabled) {
		return 'disabled';
	}

	console.info(
		'[returns-debug]',
		JSON.stringify({ at: now.toISOString(), userId, events }),
	);
	return 'logged';
}

export { getScanStats, logScannerDebugEvents, saveScanLog };
