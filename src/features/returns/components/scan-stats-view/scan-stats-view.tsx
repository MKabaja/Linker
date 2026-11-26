import { StatTile } from '@/shared/components/stat-tile';
import type { ScanOutcome } from '@/features/returns/model/scan-log.schemas';
import type { ScanStats } from '@/features/returns/model/scan-log.types';
import { scanStatsViewStyles } from './scan-stats-view.styles';

type ScanStatsViewProps = { stats: ScanStats };

type LabelByOutcome = Record<ScanOutcome, string>;

const labelByOutcome: LabelByOutcome = {
	auto: 'Automatycznie',
	'manual-pick': 'Wybór z listy',
	'manual-entry': 'Wpisane ręcznie',
	'not-found': 'Nie znaleziono',
	aborted: 'Przerwane',
};

const outcomes: ScanOutcome[] = [
	'auto',
	'manual-pick',
	'manual-entry',
	'not-found',
	'aborted',
];

const MILLISECONDS_IN_SECOND = 1000;
const PERCENT = 100;
const NO_VALUE = '—';

export function ScanStatsView({ stats }: ScanStatsViewProps) {
	const { root, tiles, tables } = scanStatsViewStyles;

	return (
		<div className={root}>
			<dl className={tiles}>
				<StatTile label="Skany" value={stats.total} />
				<StatTile
					label="Trafione automatycznie"
					value={formatRate(stats.autoRate)}
				/>
				<StatTile
					label="Mediana (auto)"
					value={formatSeconds(stats.autoDuration?.medianMs)}
					hint={`p90: ${formatSeconds(stats.autoDuration?.p90Ms)}`}
				/>
				<StatTile
					label="Mediana (znalezione)"
					value={formatSeconds(stats.foundDuration?.medianMs)}
					hint={`p90: ${formatSeconds(stats.foundDuration?.p90Ms)}`}
				/>
			</dl>
			<div className={tables}>
				<StatsTable
					caption="Skany wg wyniku"
					rows={outcomes.map((outcome) => ({
						label: labelByOutcome[outcome],
						count: stats.byOutcome[outcome],
					}))}
				/>
				<StatsTable
					caption="Przyczyny braku trafienia automatycznego"
					rows={stats.failureReasons.map(({ reason, count }) => ({
						label: reason,
						count,
					}))}
				/>
			</div>
		</div>
	);
}

type StatsTableProps = {
	caption: string;
	rows: { label: string; count: number }[];
};

function StatsTable({ caption, rows }: StatsTableProps) {
	const {
		tableWrapper,
		tableElement,
		caption: captionStyle,
		headerCell,
		bodyRow,
		bodyCell,
		numberCell,
		empty,
	} = scanStatsViewStyles;

	return (
		<div className={tableWrapper}>
			<table className={tableElement}>
				<caption className={captionStyle}>{caption}</caption>
				<thead className="sr-only">
					<tr>
						<th scope="col">Nazwa</th>
						<th scope="col">Liczba</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({ label, count }) => (
						<tr key={label} className={bodyRow}>
							<th
								scope="row"
								className={`${headerCell} ${bodyCell} font-normal`}
							>
								{label}
							</th>
							<td className={`${bodyCell} ${numberCell}`}>{count}</td>
						</tr>
					))}
				</tbody>
			</table>
			{rows.length === 0 && <p className={empty}>Brak danych.</p>}
		</div>
	);
}

function formatRate(rate: number | null): string {
	return rate === null ? NO_VALUE : `${Math.round(rate * PERCENT)}%`;
}

function formatSeconds(milliseconds: number | undefined): string {
	return milliseconds === undefined
		? NO_VALUE
		: `${(milliseconds / MILLISECONDS_IN_SECOND).toFixed(1)} s`;
}
