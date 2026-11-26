import type { ScanOutcome } from '@/features/returns/model/scan-log.schemas';

type ScanCandidate = { orderId: number; bits: number };

/** Pola wpisu dziennika potrzebne do statystyk. */
type ScanSummaryEntry = {
	outcome: ScanOutcome;
	durationMs: number;
	chosenOrderId: number | null;
	traceCount: number;
	topCandidates: ScanCandidate[];
};

type DurationPercentiles = { medianMs: number; p90Ms: number };

type FailureReasonCount = { reason: string; count: number };

type ScanCountByOutcome = Record<ScanOutcome, number>;

type ScanStats = {
	total: number;
	byOutcome: ScanCountByOutcome;
	/** Udział `auto` od 0 do 1; `null` bez wpisów. */
	autoRate: number | null;
	/** Czas do automatycznego trafienia; `null` bez takich skanów. */
	autoDuration: DurationPercentiles | null;
	/** Czas do znalezienia zamówienia (automat i ręcznie). */
	foundDuration: DurationPercentiles | null;
	/** Przyczyny skanów bez automatycznego trafienia, malejąco. */
	failureReasons: FailureReasonCount[];
};

type SaveScanLogResult = { status: 'saved' } | { status: 'invalid' };

export type {
	DurationPercentiles,
	FailureReasonCount,
	SaveScanLogResult,
	ScanCandidate,
	ScanCountByOutcome,
	ScanStats,
	ScanSummaryEntry,
};
