/**
 * Pozycja wzorca: jeden znak to znak znany, kilka znaków to alternatywy (np. `"56"`), `""` to dziura.
 */
type PatternSlot = string;

type Pattern = PatternSlot[];

/**
 * Maska bez pozycji: znany początek i koniec, np. telefon `732*****3` to `{ prefix: '732', suffix: '3' }`.
 */
type AnchoredMask = { prefix: string; suffix: string };

type TraceKind =
	| 'package'
	| 'orderId'
	| 'externalId'
	| 'phone'
	| 'name'
	| 'postcode';

type NumberTraceKind = Exclude<TraceKind, 'phone' | 'name'>;

type TraceSource = 'code' | 'rapid' | 'tess-digits' | 'tess-general' | 'manual';

type NumberTraceQuery = {
	id: string;
	kind: NumberTraceKind;
	pattern: Pattern;
	/**
	 * Numer paczki z jednego odczytu OCR (bez kodu, wpisu ręcznego i drugiego zgodnego głosu).
	 * Przybliżone trafienie takim numerem nie wystarcza do `auto`.
	 */
	isSingleOcrRead?: boolean;
};

type PhoneTraceQuery = {
	id: string;
	kind: 'phone';
	pattern: Pattern | null;
	anchored: AnchoredMask | null;
};

type NameTraceQuery = { id: string; kind: 'name'; prefixes: string[] };

/**
 * Trop wysyłany do punktacji. `id` ma postać `t3@2` (trop i wersja wzorca) i wraca w wyniku punktacji.
 */
type TraceQuery = NumberTraceQuery | PhoneTraceQuery | NameTraceQuery;

type TraceState = 'reading' | 'checked-none' | 'candidates' | 'hit';

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Pojedynczy odczyt sklasyfikowany jako trop. `query.id` jest puste, nadaje je kolektor tropów.
 */
type RawRead = {
	kind: TraceKind;
	source: TraceSource;
	text: string;
	bbox?: Rect;
	query: TraceQuery;
};

type TraceEntry = {
	id: string;
	kind: TraceKind;
	display: string;
	sources: TraceSource[];
	votes: number;
	state: TraceState;
	version: number;
	bbox?: Rect;
	/** Czas ostatniego odczytu w ms (z zegara kolektora). */
	seenAt: number;
	query: TraceQuery;
};

export type {
	AnchoredMask,
	NameTraceQuery,
	NumberTraceKind,
	NumberTraceQuery,
	Pattern,
	PatternSlot,
	PhoneTraceQuery,
	RawRead,
	Rect,
	TraceEntry,
	TraceKind,
	TraceQuery,
	TraceSource,
	TraceState,
};
