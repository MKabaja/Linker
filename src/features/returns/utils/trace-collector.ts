import type { ScoreResult } from '@/features/returns/model/order-scoring.types';
import { defaultShopMatchingConfig } from '@/features/returns/model/returns.constants';
import type { ShopMatchingConfig } from '@/features/returns/model/returns.types';
import type {
	Pattern,
	RawRead,
	TraceEntry,
	TraceQuery,
	TraceSource,
} from '@/features/returns/model/traces.types';
import {
	type CollectedTrace,
	isProtected,
	isSearchable,
	patternOf,
	toExactKey,
	toPublicEntry,
	toSearchKey,
	withPattern,
} from '@/features/returns/utils/collected-trace';
import { isShopTrace } from '@/features/returns/utils/shop-exclusions';
import { describeTrace } from '@/features/returns/utils/trace-format';
import {
	isSameNumberRead,
	votePattern,
} from '@/features/returns/utils/trace-voting';

const MAX_ENTRIES = 40;
const MAX_READS_PER_ENTRY = 15;

type WeightBySource = Record<TraceSource, number>;

const weightBySource: WeightBySource = {
	code: 10,
	manual: 10,
	rapid: 2,
	'tess-digits': 1,
	'tess-general': 1,
};

type TraceCollectorOptions = {
	shop?: ShopMatchingConfig;
	/** Zegar w ms dla `TraceEntry.seenAt`; domyślnie `Date.now`. */
	now?: () => number;
};

type TraceCollector = {
	/** Dodaje odczyty i zwraca tropy nowe albo ze zmienionym wzorcem. */
	addReads: (reads: RawRead[]) => TraceEntry[];
	entries: () => TraceEntry[];
	/** Zwraca tropy gotowe do punktacji; odczyty OCR krótkich numerów i telefonów dopiero po 2 głosach. */
	queries: () => TraceQuery[];
	/** Sprawdza, czy zestaw tropów albo ich wzorce zmieniły się od ostatniego `markResult`. */
	needsSearch: () => boolean;
	/**
	 * Ustawia stany tropów według wyniku punktacji; wynik dla starszej wersji wzorca jest pomijany.
	 * `searched` to tropy faktycznie wysłane, domyślnie `result.traces`.
	 */
	markResult: (result: ScoreResult, searched?: TraceQuery[]) => void;
	/** Szuka tropu po identyfikatorze z wyniku punktacji (`t3@2`) albo samym `t3`. */
	entryByTraceId: (traceId: string) => TraceEntry | undefined;
};

/**
 * Tworzy zbiór tropów jednego skanu: łączy odczyty w tropy, głosuje nad wzorcem i pilnuje,
 * żeby sprawdzony trop nie był szukany ponownie, dopóki jego wzorzec się nie zmieni.
 * Trzyma najwyżej 40 tropów; trafienia, kody i wpisy ręczne nie są usuwane.
 */
function createTraceCollector({
	shop = defaultShopMatchingConfig,
	now = Date.now,
}: TraceCollectorOptions = {}): TraceCollector {
	let traces: CollectedTrace[] = [];
	let nextId = 1;
	let tick = 0;
	let searchedKey = '';

	function addReads(reads: RawRead[]): TraceEntry[] {
		tick++;
		const changed = new Set<CollectedTrace>();
		for (const read of reads) {
			if (isShopTrace(read.query, shop)) {
				continue;
			}
			const trace = absorbRead(read);
			if (trace) {
				changed.add(trace);
			}
		}
		evictExcessTraces();
		return [...changed]
			.filter((trace) => traces.includes(trace))
			.map(toPublicEntry);
	}

	function queries(): TraceQuery[] {
		return traces.filter(isSearchable).map((trace) => trace.query);
	}

	function needsSearch(): boolean {
		const key = toSearchKey(queries());
		return key !== '' && key !== searchedKey;
	}

	function markResult(result: ScoreResult, searched?: TraceQuery[]): void {
		searchedKey = toSearchKey(
			searched ?? result.traces.map((trace) => ({ id: trace.traceId })),
		);
		const candidateTraceIds = new Set(
			result.candidates.flatMap((candidate) =>
				candidate.reasons.map((reason) => reason.traceId),
			),
		);
		const hitTraceIds = new Set(
			result.decision === 'auto'
				? (result.candidates[0]?.reasons.map((reason) => reason.traceId) ?? [])
				: [],
		);
		for (const score of result.traces) {
			const trace = traces.find((item) => item.query.id === score.traceId);
			if (!trace) {
				continue;
			}
			if (hitTraceIds.has(score.traceId)) {
				trace.state = 'hit';
			} else if (score.matches > 0 && candidateTraceIds.has(score.traceId)) {
				trace.state = 'candidates';
			} else {
				trace.state = 'checked-none';
			}
		}
	}

	function entryByTraceId(traceId: string): TraceEntry | undefined {
		const [id] = traceId.split('@');
		const trace = traces.find((item) => item.id === id);
		return trace && toPublicEntry(trace);
	}

	function absorbRead(read: RawRead): CollectedTrace | null {
		const exactKey = toExactKey(read.query);
		const pattern = patternOf(read.query);
		const existing = traces.find((trace) =>
			exactKey
				? trace.exactKey === exactKey
				: trace.kind === read.kind &&
					!trace.exactKey &&
					pattern !== null &&
					isSameNumberRead(patternOf(trace.query) ?? [], pattern),
		);
		if (!existing) {
			const trace = createTrace(read, exactKey, pattern);
			traces.push(trace);
			return trace;
		}
		return updateTrace(existing, read, pattern);
	}

	function createTrace(
		read: RawRead,
		exactKey: string | null,
		pattern: Pattern | null,
	): CollectedTrace {
		const id = `t${nextId++}`;
		return {
			id,
			kind: read.kind,
			display: describeTrace(read.query, [read.source]),
			sources: [read.source],
			votes: 1,
			state: 'reading',
			version: 1,
			bbox: read.bbox,
			seenAt: now(),
			query: { ...read.query, id: `${id}@1` },
			reads: pattern ? [{ pattern, weight: weightBySource[read.source] }] : [],
			exactKey,
			lastSeenTick: tick,
		};
	}

	function updateTrace(
		trace: CollectedTrace,
		read: RawRead,
		pattern: Pattern | null,
	): CollectedTrace | null {
		trace.votes++;
		trace.lastSeenTick = tick;
		trace.seenAt = now();
		trace.bbox = read.bbox ?? trace.bbox;
		if (!trace.sources.includes(read.source)) {
			trace.sources.push(read.source);
		}
		if (!pattern || trace.exactKey) {
			return null;
		}
		trace.reads.push({ pattern, weight: weightBySource[read.source] });
		if (trace.reads.length > MAX_READS_PER_ENTRY) {
			trace.reads.shift();
		}
		const voted = votePattern(trace.reads, pattern.length);
		const isUnchanged =
			voted.join('|') === (patternOf(trace.query) ?? []).join('|');
		if (!isUnchanged) {
			trace.version++;
			trace.query = withPattern(
				trace.query,
				`${trace.id}@${trace.version}`,
				voted,
			);
			trace.state = 'reading';
		}
		trace.display = describeTrace(trace.query, trace.sources);
		return isUnchanged ? null : trace;
	}

	function evictExcessTraces(): void {
		while (traces.length > MAX_ENTRIES) {
			const removable = traces.filter((trace) => !isProtected(trace));
			if (removable.length === 0) {
				return;
			}
			removable.sort(
				(left, right) =>
					left.votes - right.votes || left.lastSeenTick - right.lastSeenTick,
			);
			const [evicted] = removable;
			traces = traces.filter((trace) => trace !== evicted);
		}
	}

	return {
		addReads,
		entries: () => traces.map(toPublicEntry),
		queries,
		needsSearch,
		markResult,
		entryByTraceId,
	};
}

export {
	createTraceCollector,
	type TraceCollector,
	type TraceCollectorOptions,
};
