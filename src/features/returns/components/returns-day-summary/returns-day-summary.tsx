import { StatTile } from '@/shared/components/stat-tile';
import type { DayReturns } from '@/features/returns/model/returns.types';
import type { ReturnsListScope } from '@/features/returns/model/returns-list.types';
import { toReturnsListSearch } from '@/features/returns/utils/returns-list-query';
import { returnsDaySummaryStyles } from './returns-day-summary.styles';

type ReturnsDaySummaryProps = {
	summary: DayReturns['summary'];
	/** Zakres listy; kafel „Bez korekty” włącza w nim filtr korekty (a gdy jest włączony, wyłącza go). */
	scope: ReturnsListScope;
};

export function ReturnsDaySummary({ summary, scope }: ReturnsDaySummaryProps) {
	const isWithoutFilterActive = scope.correction === 'without';
	const withoutCorrectionSearch = toReturnsListSearch({
		...scope,
		correction: isWithoutFilterActive ? 'all' : 'without',
	});

	return (
		<dl className={returnsDaySummaryStyles.list}>
			<StatTile variant="card" label="Zwroty" value={summary.total} />
			<StatTile variant="card" label="Pełne" value={summary.full} />
			<StatTile variant="card" label="Częściowe" value={summary.partial} />
			<StatTile
				variant="card"
				label="Bez korekty"
				value={summary.withoutCorrection}
				href={`/returns${withoutCorrectionSearch}`}
				isActive={isWithoutFilterActive}
			/>
		</dl>
	);
}
