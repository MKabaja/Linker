import type { ScanOutcome } from '@/features/returns/model/scan-log.schemas';
import type {
	DurationPercentiles,
	FailureReasonCount,
	ScanCountByOutcome,
	ScanStats,
	ScanSummaryEntry,
} from '@/features/returns/model/scan-log.types';

const AUTO_MARGIN_BITS = 3;
const MEDIAN = 0.5;
const P90 = 0.9;

const foundOutcomes: readonly ScanOutcome[] = [
	'auto',
	'manual-pick',
	'manual-entry',
];

/**
 * Liczy statystyki skanów: odsetek trafień automatycznych, medianę i 90. percentyl czasu oraz przyczyny porażek.
 *
 * @remarks Przyczyna porażki jest heurystyką z zapisanych tropów i kandydatów; percentyle metodą najbliższej rangi.
 */
export function summarizeScans(entries: ScanSummaryEntry[]): ScanStats {
	const byOutcome = countByOutcome(entries);
	const autoDurations = entries
		.filter(({ outcome }) => outcome === 'auto')
		.map(({ durationMs }) => durationMs);
	const foundDurations = entries
		.filter(({ outcome }) => foundOutcomes.includes(outcome))
		.map(({ durationMs }) => durationMs);

	return {
		total: entries.length,
		byOutcome,
		autoRate: entries.length > 0 ? byOutcome.auto / entries.length : null,
		autoDuration: toPercentiles(autoDurations),
		foundDuration: toPercentiles(foundDurations),
		failureReasons: countFailureReasons(entries),
	};
}

function countByOutcome(entries: ScanSummaryEntry[]): ScanCountByOutcome {
	const byOutcome: ScanCountByOutcome = {
		auto: 0,
		'manual-pick': 0,
		'manual-entry': 0,
		'not-found': 0,
		aborted: 0,
	};

	for (const { outcome } of entries) {
		byOutcome[outcome] += 1;
	}

	return byOutcome;
}

function countFailureReasons(
	entries: ScanSummaryEntry[],
): FailureReasonCount[] {
	const countByReason = new Map<string, number>();

	for (const entry of entries) {
		if (entry.outcome === 'auto') {
			continue;
		}

		const reason = describeFailure(entry);
		countByReason.set(reason, (countByReason.get(reason) ?? 0) + 1);
	}

	return [...countByReason]
		.map(([reason, count]) => ({ reason, count }))
		.sort((left, right) => right.count - left.count);
}

function describeFailure(entry: ScanSummaryEntry): string {
	const [first, second] = entry.topCandidates;

	if (entry.traceCount === 0) {
		return 'Nic nie odczytano (brak tropów)';
	}

	if (!first) {
		return 'Tropy nie pasowały do żadnego zamówienia';
	}

	const isChosenAmongCandidates = entry.topCandidates.some(
		(candidate) => candidate.orderId === entry.chosenOrderId,
	);

	if (entry.chosenOrderId !== null && !isChosenAmongCandidates) {
		return 'Właściwego zamówienia nie było wśród kandydatów';
	}

	if (second && first.bits - second.bits < AUTO_MARGIN_BITS) {
		return 'Za mała przewaga nad drugim kandydatem';
	}

	return 'Za mało bitów (poniżej progu)';
}

function toPercentiles(durations: number[]): DurationPercentiles | null {
	if (durations.length === 0) {
		return null;
	}

	const sorted = [...durations].sort((left, right) => left - right);

	return {
		medianMs: nearestRank(sorted, MEDIAN),
		p90Ms: nearestRank(sorted, P90),
	};
}

function nearestRank(sorted: number[], percentile: number): number {
	const rank = Math.ceil(percentile * sorted.length);
	return sorted[Math.max(0, rank - 1)];
}
