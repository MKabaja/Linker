'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { searchResponseSchema } from '@/features/returns/model/order-search.schemas';
import type {
	SearchCandidate,
	SearchResponse,
} from '@/features/returns/model/order-search.types';
import type {
	RawRead,
	TraceEntry,
} from '@/features/returns/model/traces.types';
import { createTraceCollector } from '@/features/returns/utils/trace-collector';

const SEARCH_URL = '/api/returns/search';
const REQUEST_TIMEOUT_MS = 10_000;
const UNAUTHORIZED_STATUS = 401;

type SearchProblem = 'unauthorized' | 'unavailable';

type AutoMatch = {
	candidate: SearchCandidate;
	entries: TraceEntry[];
	candidates: SearchCandidate[];
};

type UseTraceSearchOptions = {
	onAutoMatch: (match: AutoMatch) => void;
};

type UseTraceSearchResult = {
	entries: TraceEntry[];
	result: SearchResponse | null;
	problem: SearchProblem | null;
	addReads: (reads: RawRead[]) => void;
	/** Dodaje odczyty i czeka, aż skończą się wyszukiwania; zwraca ostatni wynik. */
	searchReads: (reads: RawRead[]) => Promise<SearchResponse | null>;
	/** Po wyborze zamówienia kończy dalsze szukanie i ignoruje spóźnione odpowiedzi. */
	stop: () => void;
	/** Wznawia szukanie po nieudanym zapisie zwrotu. */
	resume: () => void;
};

/**
 * Zbiera tropy skanu (kolektor z głosowaniem) i wysyła je na `/api/returns/search`.
 * Najwyżej jedno żądanie naraz; zmiany w trakcie dają jedno kolejne. Decyzja `auto` wywołuje `onAutoMatch`.
 * Błędy sieci i serwera są stanem (`problem`), nie wyjątkiem; żądanie ma limit 10 s.
 */
function useTraceSearch({
	onAutoMatch,
}: UseTraceSearchOptions): UseTraceSearchResult {
	const [collector] = useState(createTraceCollector);
	const [entries, setEntries] = useState<TraceEntry[]>([]);
	const [result, setResult] = useState<SearchResponse | null>(null);
	const [problem, setProblem] = useState<SearchProblem | null>(null);
	const busyRef = useRef<Promise<void> | null>(null);
	const isPendingRef = useRef(false);
	const isStoppedRef = useRef(false);
	const latestResultRef = useRef<SearchResponse | null>(null);
	const abortRef = useRef(new AbortController());
	const handleAutoMatch = useEffectEvent(onAutoMatch);

	useEffect(() => {
		const controller = new AbortController();
		abortRef.current = controller;
		return () => controller.abort();
	}, []);

	function addReads(reads: RawRead[]) {
		if (reads.length === 0 || isStoppedRef.current) {
			return;
		}
		const changed = collector.addReads(reads);
		setEntries(collector.entries());
		if (changed.length > 0) {
			requestSearch();
		}
	}

	async function searchReads(reads: RawRead[]) {
		addReads(reads);
		while (busyRef.current) {
			await busyRef.current;
		}
		return latestResultRef.current;
	}

	function resume() {
		isStoppedRef.current = false;
	}

	function stop() {
		isStoppedRef.current = true;
	}

	function requestSearch() {
		if (isStoppedRef.current) {
			return;
		}
		if (busyRef.current) {
			isPendingRef.current = true;
			return;
		}
		if (collector.needsSearch()) {
			busyRef.current = performSearch();
		}
	}

	async function performSearch() {
		const sent = collector.queries();
		try {
			const response = await fetch(SEARCH_URL, {
				method: 'POST',
				body: JSON.stringify({ traces: sent }),
				signal: AbortSignal.any([
					abortRef.current.signal,
					AbortSignal.timeout(REQUEST_TIMEOUT_MS),
				]),
			});
			if (response.status === UNAUTHORIZED_STATUS) {
				setProblem('unauthorized');
				return;
			}
			if (!response.ok) {
				setProblem('unavailable');
				return;
			}
			const searchResponse = searchResponseSchema.parse(await response.json());
			if (isStoppedRef.current) {
				return;
			}
			collector.markResult(searchResponse, sent);
			latestResultRef.current = searchResponse;
			setProblem(null);
			setResult(searchResponse);
			setEntries(collector.entries());
			const [best] = searchResponse.candidates;
			if (searchResponse.decision === 'auto' && best) {
				handleAutoMatch({
					candidate: best,
					entries: collector.entries(),
					candidates: searchResponse.candidates,
				});
			}
		} catch {
			if (!abortRef.current.signal.aborted) {
				setProblem('unavailable');
			}
		} finally {
			busyRef.current = null;
			if (isPendingRef.current) {
				isPendingRef.current = false;
				requestSearch();
			}
		}
	}

	return { entries, result, problem, addReads, searchReads, stop, resume };
}

export { type AutoMatch, type SearchProblem, useTraceSearch };
