import type { ClientEventFields } from '@/features/returns/model/event-log.types';
import type { ScanLogInput } from '@/features/returns/model/scan-log.schemas';
import type {
	RawRead,
	TraceEntry,
} from '@/features/returns/model/traces.types';
import { isShopTrace } from '@/features/returns/utils/shop-exclusions';
import { toTracePatternLabel } from '@/features/returns/utils/trace-pattern-label';
import { markReadAsNew } from './scan-event-buffer';

const MAX_PATTERN_LENGTH = 80;
const MAX_TEXT_LENGTH = 300;

type TraceStateByTraceId = Map<string, string>;

type FinishedEventInput = {
	scanLog: ScanLogInput;
	view?: 'near' | 'wide';
	zoom?: number;
	frame?: { width: number; height: number };
};

/**
 * Zamienia odczyty na zdarzenia dziennika, pomijając te, które w skanie już były (rodzaj, źródło i tekst).
 * Odczyt sklasyfikowany jako dane sklepu daje `scan.trace-rejected`, pozostałe `scan.read`.
 *
 * @remarks Mutuje `seen`. Szum odrzucony wcześniej przez klasyfikator tekstu nie jest tu widoczny.
 */
function buildReadEvents(
	reads: RawRead[],
	seen: Set<string>,
): ClientEventFields[] {
	return reads
		.filter((read) => markReadAsNew(seen, read))
		.map((read): ClientEventFields => {
			const base = {
				kind: read.kind,
				source: read.source,
				pattern: toTracePatternLabel(read.query).slice(0, MAX_PATTERN_LENGTH),
				text: read.text.slice(0, MAX_TEXT_LENGTH),
			};
			return isShopTrace(read.query)
				? { type: 'scan.trace-rejected', reason: 'shop', ...base }
				: { type: 'scan.read', ...base };
		});
}

/**
 * Zwraca zdarzenia dla tropów, których stan lub wersja zmieniły się od poprzedniego wywołania.
 *
 * @remarks Mutuje `lastLogged` (identyfikator tropu na `stan@wersja`).
 */
function buildTraceStateEvents(
	entries: TraceEntry[],
	lastLogged: TraceStateByTraceId,
): ClientEventFields[] {
	const events: ClientEventFields[] = [];

	for (const entry of entries) {
		const stateKey = `${entry.state}@${entry.version}`;

		if (lastLogged.get(entry.id) === stateKey) {
			continue;
		}
		lastLogged.set(entry.id, stateKey);
		events.push({
			type: 'scan.trace-state',
			traceId: entry.id,
			kind: entry.kind,
			pattern: entry.display.slice(0, MAX_PATTERN_LENGTH),
			state: entry.state,
			version: entry.version,
		});
	}

	return events;
}

/**
 * Buduje `scan.finished` z wpisu dziennika skanów i danych aparatu.
 */
function buildScanFinishedEvent({
	scanLog,
	view,
	zoom,
	frame,
}: FinishedEventInput): ClientEventFields {
	const { diagnostics } = scanLog;

	return {
		type: 'scan.finished',
		outcome: scanLog.outcome,
		durationMs: scanLog.durationMs,
		chosenOrderId: scanLog.chosenOrderId,
		view,
		zoom,
		frame,
		cameraLabel: scanLog.cameraLabel,
		cameraRestarts: diagnostics?.cameraRestarts ?? 0,
		traceCount: scanLog.traces.length,
		ocrFrames: scanLog.ocr.frames,
		ocrAvgMs: scanLog.ocr.avgMs,
		ocrErrors: diagnostics?.ocrErrors ?? 0,
		ocrRejected: diagnostics?.ocrRejected ?? 0,
		gateChecks: diagnostics?.gateChecks ?? 0,
		gatePassed: diagnostics?.gatePassed ?? 0,
		barcodeCalls: diagnostics?.barcodeCalls ?? 0,
	};
}

export {
	buildReadEvents,
	buildScanFinishedEvent,
	buildTraceStateEvents,
	type TraceStateByTraceId,
};
