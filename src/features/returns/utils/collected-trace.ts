import type {
	Pattern,
	TraceEntry,
	TraceQuery,
	TraceSource,
} from '@/features/returns/model/traces.types';
import type { WeightedPattern } from '@/features/returns/utils/trace-voting';

const MIN_OCR_VOTES = 2;
const SELF_CHECKING_LENGTH = 12;

type CollectedTrace = TraceEntry & {
	reads: WeightedPattern[];
	exactKey: string | null;
	lastSeenTick: number;
};

function isProtected(trace: CollectedTrace): boolean {
	return trace.state === 'hit' || isTrustedSource(trace.sources);
}

/**
 * Sprawdza, czy trop może iść do punktacji: kody, wpisy ręczne, imiona, kody pocztowe
 * i numery paczek od 12 znaków od razu, pozostałe odczyty OCR dopiero po 2 głosach.
 */
function isSearchable(trace: CollectedTrace): boolean {
	const { query } = trace;
	if (isTrustedSource(trace.sources)) {
		return true;
	}
	if (query.kind === 'name' || query.kind === 'postcode') {
		return true;
	}
	if (
		query.kind === 'package' &&
		query.pattern.length >= SELF_CHECKING_LENGTH
	) {
		return true;
	}
	return trace.votes >= MIN_OCR_VOTES;
}

function patternOf(query: TraceQuery): Pattern | null {
	return query.kind === 'name' ? null : query.pattern;
}

/**
 * Zwraca klucz tropu bez wzorca pozycyjnego (imię, telefon z kotwicami), który łączy się tylko przy identycznej treści.
 * Dla pozostałych tropów `null`.
 */
function toExactKey(query: TraceQuery): string | null {
	if (query.kind === 'name') {
		return `name:${query.prefixes.join('/')}`;
	}
	if (query.kind === 'phone' && !query.pattern) {
		return `phone:${query.anchored?.prefix}…${query.anchored?.suffix}`;
	}
	return null;
}

function withPattern(
	query: TraceQuery,
	id: string,
	pattern: Pattern,
): TraceQuery {
	if (query.kind === 'phone') {
		return { id, kind: 'phone', pattern, anchored: null };
	}
	if (query.kind === 'name') {
		return { ...query, id };
	}
	return { id, kind: query.kind, pattern };
}

function toSearchKey(queries: { id: string }[]): string {
	return queries
		.map((query) => query.id)
		.sort()
		.join(',');
}

function toPublicEntry(trace: CollectedTrace): TraceEntry {
	const {
		reads: _reads,
		exactKey: _exactKey,
		lastSeenTick: _lastSeenTick,
		...entry
	} = trace;
	return { ...entry, sources: [...entry.sources] };
}

function isTrustedSource(sources: TraceSource[]): boolean {
	return sources.includes('code') || sources.includes('manual');
}

export {
	type CollectedTrace,
	isProtected,
	isSearchable,
	patternOf,
	toExactKey,
	toPublicEntry,
	toSearchKey,
	withPattern,
};
