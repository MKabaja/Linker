import type { OcrResponse } from '@/features/returns/model/ocr.types';
import type { SearchCandidate } from '@/features/returns/model/order-search.types';
import type {
	ScanLogInput,
	ScanOutcome,
} from '@/features/returns/model/scan-log.schemas';
import type { TraceEntry } from '@/features/returns/model/traces.types';

const ENGINE_TIMING_PREFIX = 'ocr:';
const MAX_TOP_CANDIDATES = 10;
const MAX_DISPLAY_LENGTH = 80;

type EngineStats = { count: number; totalMs: number };

type ScanDiagnostics = {
	scanId: string;
	startedAtMs: number;
	noteBarcodeCall: (milliseconds: number) => void;
	noteCarrier: (carrier: string | null) => void;
	noteGate: (isPassed: boolean) => void;
	noteCapture: (milliseconds: number) => void;
	noteOcr: (ocr: OcrResponse, roundTripMs: number) => void;
	noteOcrRejected: () => void;
	noteOcrError: () => void;
	noteCameraRestart: () => void;
	noteCameraLabel: (label: string) => void;
	noteManualEntry: () => void;
	isManualEntry: () => boolean;
	toScanLog: (input: ScanLogSnapshot) => ScanLogInput;
};

type ScanLogSnapshot = {
	outcome: ScanOutcome;
	nowMs: number;
	chosenOrderId?: number;
	entries: TraceEntry[];
	candidates: SearchCandidate[];
};

/**
 * Zbiera liczniki jednego skanu (czasy kodów, bramki i OCR, błędy, restarty aparatu) do wpisu dziennika.
 * Obiekt jest mutowalny, bo jest aktualizowany z pętli poza renderem.
 */
function createScanDiagnostics(startedAtMs: number): ScanDiagnostics {
	const scanId = crypto.randomUUID();
	const carriers = new Set<string>();
	const statsByEngine = new Map<string, EngineStats>();
	let isManual = false;
	let cameraLabel: string | undefined;
	let barcodeCalls = 0;
	let barcodeTotalMs = 0;
	let captures = 0;
	let captureTotalMs = 0;
	let ocrFrames = 0;
	let ocrTotalMs = 0;
	let ocrMaxMs = 0;
	let ocrRejected = 0;
	let ocrErrors = 0;
	let cameraRestarts = 0;
	let gateChecks = 0;
	let gatePassed = 0;

	function toScanLog({
		outcome,
		nowMs,
		chosenOrderId,
		entries,
		candidates,
	}: ScanLogSnapshot): ScanLogInput {
		return {
			scanId,
			startedAt: new Date(startedAtMs).toISOString(),
			durationMs: Math.max(0, nowMs - startedAtMs),
			outcome,
			chosenOrderId,
			traces: entries.map((entry) => ({
				display: entry.display.slice(0, MAX_DISPLAY_LENGTH),
				kind: entry.kind,
				sources: entry.sources,
				votes: entry.votes,
				state: entry.state,
			})),
			topCandidates: candidates
				.slice(0, MAX_TOP_CANDIDATES)
				.map(({ orderId, bits }) => ({ orderId, bits })),
			ocr: {
				frames: ocrFrames,
				avgMs: average(ocrTotalMs, ocrFrames),
				maxMs: ocrMaxMs,
				byEngine: Object.fromEntries(
					[...statsByEngine].map(([engine, { count, totalMs }]) => [
						engine,
						{ count, avgMs: average(totalMs, count) },
					]),
				),
			},
			carriers: [...carriers],
			cameraLabel,
			diagnostics: {
				ocrErrors,
				cameraRestarts,
				ocrRejected,
				barcodeCalls,
				barcodeAvgMs: average(barcodeTotalMs, barcodeCalls),
				captureAvgMs: average(captureTotalMs, captures),
				gateChecks,
				gatePassed,
			},
		};
	}

	return {
		scanId,
		startedAtMs,
		noteBarcodeCall(milliseconds) {
			barcodeCalls++;
			barcodeTotalMs += milliseconds;
		},
		noteCarrier(carrier) {
			if (carrier) {
				carriers.add(carrier);
			}
		},
		noteGate(isPassed) {
			gateChecks++;
			if (isPassed) {
				gatePassed++;
			}
		},
		noteCapture(milliseconds) {
			captures++;
			captureTotalMs += milliseconds;
		},
		noteOcr(ocr, roundTripMs) {
			ocrFrames++;
			ocrTotalMs += roundTripMs;
			ocrMaxMs = Math.max(ocrMaxMs, roundTripMs);
			for (const [key, milliseconds] of Object.entries(ocr.timings)) {
				if (!key.startsWith(ENGINE_TIMING_PREFIX)) {
					continue;
				}
				const engine = key.slice(ENGINE_TIMING_PREFIX.length);
				const stats = statsByEngine.get(engine) ?? { count: 0, totalMs: 0 };
				statsByEngine.set(engine, {
					count: stats.count + 1,
					totalMs: stats.totalMs + milliseconds,
				});
			}
		},
		noteOcrRejected() {
			ocrRejected++;
		},
		noteOcrError() {
			ocrErrors++;
		},
		noteCameraRestart() {
			cameraRestarts++;
		},
		noteCameraLabel(label) {
			cameraLabel = label || undefined;
		},
		noteManualEntry() {
			isManual = true;
		},
		isManualEntry: () => isManual,
		toScanLog,
	};
}

function average(total: number, count: number): number {
	return count === 0 ? 0 : Math.round(total / count);
}

export { createScanDiagnostics, type ScanDiagnostics };
