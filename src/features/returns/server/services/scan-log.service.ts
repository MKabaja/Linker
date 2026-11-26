import 'server-only';
import type { ScanLog } from '@/features/returns/model/scan-log.schemas';
import type { ScanStats } from '@/features/returns/model/scan-log.types';
import {
	findRecentScanSummaries,
	insertScanLog,
} from '@/features/returns/server/repositories/scan-logs.repository';
import { summarizeScans } from '@/features/returns/utils/scan-stats';

const STATS_SCAN_LIMIT = 5000;

type ScanLogRequest = { scanLog: ScanLog; userId: number };

function saveScanLog({ scanLog, userId }: ScanLogRequest): Promise<void> {
	return insertScanLog({ scanLog, userId });
}

/**
 * Statystyki z najwyżej 5000 ostatnich skanów.
 */
async function getScanStats(): Promise<ScanStats> {
	return summarizeScans(await findRecentScanSummaries(STATS_SCAN_LIMIT));
}

export { getScanStats, saveScanLog };
