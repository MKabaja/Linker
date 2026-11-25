import 'server-only';
import { desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/database/client';
import { scanLogs } from '@/database/schema/scan-logs.schema';
import type { ScanLog } from '@/features/returns/model/scan-log.schemas';
import type { ScanSummaryEntry } from '@/features/returns/model/scan-log.types';

type NewScanLog = { scanLog: ScanLog; userId: number };

const storedCandidatesSchema = z.array(
	z.object({ orderId: z.number(), bits: z.number() }),
);
const storedTracesSchema = z.array(z.unknown());

/**
 * Zapisuje wpis dziennika. Powtórzony `scanId` (ponowiona wysyłka z telefonu) jest pomijany.
 */
async function insertScanLog({ scanLog, userId }: NewScanLog): Promise<void> {
	await db
		.insert(scanLogs)
		.values({
			scanId: scanLog.scanId,
			userId,
			startedAt: new Date(scanLog.startedAt),
			durationMs: Math.round(scanLog.durationMs),
			outcome: scanLog.outcome,
			chosenOrderId: scanLog.chosenOrderId ?? null,
			traces: scanLog.traces,
			topCandidates: scanLog.topCandidates,
			ocr: scanLog.ocr,
			carriers: scanLog.carriers,
			cameraLabel: scanLog.cameraLabel ?? null,
			diagnostics: scanLog.diagnostics ?? null,
		})
		.onConflictDoNothing({ target: scanLogs.scanId });
}

/**
 * Zwraca najnowsze wpisy w kształcie do statystyk.
 */
async function findRecentScanSummaries(
	limit: number,
): Promise<ScanSummaryEntry[]> {
	const rows = await db
		.select({
			outcome: scanLogs.outcome,
			durationMs: scanLogs.durationMs,
			chosenOrderId: scanLogs.chosenOrderId,
			traces: scanLogs.traces,
			topCandidates: scanLogs.topCandidates,
		})
		.from(scanLogs)
		.orderBy(desc(scanLogs.createdAt))
		.limit(limit);

	return rows.map((row) => ({
		outcome: row.outcome,
		durationMs: row.durationMs,
		chosenOrderId: row.chosenOrderId,
		traceCount: storedTracesSchema.parse(row.traces).length,
		topCandidates: storedCandidatesSchema.parse(row.topCandidates),
	}));
}

export { findRecentScanSummaries, insertScanLog };
