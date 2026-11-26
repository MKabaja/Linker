import type { SearchResponse } from '@/features/returns/model/order-search.types';
import type { TraceEntry } from '@/features/returns/model/traces.types';
import { returnsScannerStyles } from './returns-scanner.styles';

const VISIBLE_TRACE_COUNT = 3;

type ScannerTraceListProps = {
	entries: TraceEntry[];
	result: SearchResponse | null;
};

/**
 * Trzy ostatnie tropy skanu ze stanem: czytam, nic nie znaleziono, kandydaci albo trafienie.
 */
export function ScannerTraceList({ entries, result }: ScannerTraceListProps) {
	const { glassPanel, traceList, traceItem, traceText } = returnsScannerStyles;
	const latest = entries.slice(-VISIBLE_TRACE_COUNT).reverse();
	if (latest.length === 0) {
		return null;
	}

	return (
		<ul className={`${glassPanel} ${traceList}`} aria-label="Odczytane tropy">
			{latest.map((entry) => (
				<li key={entry.id} className={traceItem}>
					<span className={traceText}>{entry.display}</span>
					<span>{describeState(entry, result)}</span>
				</li>
			))}
		</ul>
	);
}

function describeState(
	entry: TraceEntry,
	result: SearchResponse | null,
): string {
	if (entry.state === 'checked-none') {
		return 'brak w zamówieniach';
	}
	if (entry.state === 'hit') {
		return 'trafienie';
	}
	if (entry.state === 'candidates') {
		const matches = result?.traces.find(
			(trace) => trace.traceId === entry.query.id,
		)?.matches;
		return matches === undefined ? 'kandydat' : `zamówienia: ${matches}`;
	}
	return 'czytam…';
}
