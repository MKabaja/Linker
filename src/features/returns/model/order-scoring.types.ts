import type { ShopMatchingConfig } from '@/features/returns/model/returns.types';
import type { TraceKind } from '@/features/returns/model/traces.types';

/**
 * Zamówienie w indeksie w pamięci. Wartości tekstowe znormalizowane, daty w sekundach uniksowych.
 */
type IndexedOrder = {
	orderId: number;
	externalOrderId: string;
	source: string;
	statusId: number;
	dateAdd: number;
	dateConfirmed: number;
	/** Ostatnie 9 cyfr albo `''`. */
	phoneDigits: string;
	firstNameNorm: string;
	lastNameNorm: string;
	/** Same cyfry, np. `32432`. */
	postcode: string;
	cityNorm: string;
	/** Wielkie litery, bez spacji (`package_nr` i `inner_nr`). */
	packageNumbers: string[];
};

type TraceContribution = {
	traceId: string;
	kind: TraceKind;
	bits: number;
	label: string;
};

type ScoredCandidate = {
	orderId: number;
	bits: number;
	reasons: TraceContribution[];
};

type ScoreDecision = 'auto' | 'candidates' | 'none';

type TraceScore = { traceId: string; matches: number; bits: number };

type ScoreResult = {
	decision: ScoreDecision;
	/** `log2(N)`, gdzie N to liczba zamówień w indeksie. */
	threshold: number;
	/** Malejąco po bitach, najwyżej kilku. */
	candidates: ScoredCandidate[];
	traces: TraceScore[];
	indexSize: number;
};

type ScoringOptions = {
	/** Bieżący czas w ms; od niego liczony jest wiek zamówienia przy premii za datę. */
	nowMs: number;
	shop?: ShopMatchingConfig;
};

export type {
	IndexedOrder,
	ScoreDecision,
	ScoredCandidate,
	ScoreResult,
	ScoringOptions,
	TraceContribution,
	TraceScore,
};
