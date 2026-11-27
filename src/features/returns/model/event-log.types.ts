import type { ClientEvent } from '@/features/returns/model/event-log.schemas';
import type { OcrMode } from '@/features/returns/model/ocr.schemas';
import type { ScoreDecision } from '@/features/returns/model/order-scoring.types';
import type { ScannerMatchedBy } from '@/features/returns/model/return-origin.constants';
import type { TraceKind } from '@/features/returns/model/traces.types';

/** Wersja formatu linii dziennika; rośnie przy zmianie niezgodnej wstecz. */
const EVENT_LOG_VERSION = 1;

type DistributiveOmit<Union, Key extends PropertyKey> = Union extends unknown
	? Omit<Union, Key>
	: never;

type ClientEventFields = DistributiveOmit<ClientEvent, 'scanId' | 'clientAt'>;

type ReturnItemQuantity = {
	itemId: number;
	quantityReceived: number;
	condition: 'accepted' | 'damaged';
};

type SearchTraceLog = { kind: TraceKind; pattern: string };

type SearchCandidateLog = {
	orderId: number;
	bits: number;
	reasons: { traceId: string; kind: TraceKind; bits: number }[];
};

type OcrOutcome = 'done' | 'superseded' | 'aborted' | 'busy' | 'invalid-image';

type ReturnLogFields = {
	orderId: number;
	returnId: number;
	matchedBy: ScannerMatchedBy;
	scannedLabel: string | null;
};

type ServerEventFields =
	| {
			type: 'search';
			traceCount: number;
			traces: SearchTraceLog[];
			decision: ScoreDecision;
			threshold: number;
			topCandidates: SearchCandidateLog[];
			liveLookupCount: number;
			durationMs: number;
			indexSize: number;
	  }
	| {
			type: 'ocr';
			engine: string | null;
			mode: OcrMode;
			durationMs: number;
			lineCount: number;
			outcome: OcrOutcome;
	  }
	| ({ type: 'return.created' } & ReturnLogFields)
	| ({ type: 'return.duplicate' } & ReturnLogFields)
	| {
			type: 'return.updated';
			returnId: number;
			noteChanged: boolean;
			itemsBefore: ReturnItemQuantity[];
			itemsAfter: ReturnItemQuantity[];
	  }
	| { type: 'return.correction'; returnId: number; isIssued: boolean }
	| { type: 'return.deleted'; returnId: number }
	| { type: 'return.restored'; returnId: number }
	| { type: 'auth.login'; outcome: 'success' }
	| {
			type: 'auth.login';
			outcome: 'failed';
			reason: 'invalidInput' | 'rateLimited' | 'invalidCredentials';
	  }
	| { type: 'auth.logout' };

type ReturnsEventFields = ServerEventFields | ClientEventFields;

type ReturnsEventContext = {
	scanId?: string;
	userId?: number;
	userName?: string;
	/** ISO 8601 z zegara przeglądarki; tylko dla zdarzeń klienta. */
	clientAt?: string;
};

/** Zdarzenie przekazywane do `logReturnsEvent`; `v`, `at` i `appVersion` dokleja zapis. */
type ReturnsEventInput = ReturnsEventFields & ReturnsEventContext;

/** Jedna linia pliku dziennika. */
type ReturnsEvent = ReturnsEventInput & {
	v: typeof EVENT_LOG_VERSION;
	/** ISO 8601 w UTC z zegara serwera. */
	at: string;
	appVersion: string | null;
};

export {
	type ClientEventFields,
	EVENT_LOG_VERSION,
	type OcrOutcome,
	type ReturnItemQuantity,
	type ReturnsEvent,
	type ReturnsEventContext,
	type ReturnsEventFields,
	type ReturnsEventInput,
	type ServerEventFields,
};
