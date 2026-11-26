import { StatTile } from '@/shared/components/stat-tile';
import type { DayReturns } from '@/features/returns/model/returns.types';
import { returnsDaySummaryStyles } from './returns-day-summary.styles';

type ReturnsDaySummaryProps = { summary: DayReturns['summary'] };

export function ReturnsDaySummary({ summary }: ReturnsDaySummaryProps) {
	return (
		<dl className={returnsDaySummaryStyles.list}>
			<StatTile label="Zwroty" value={summary.total} />
			<StatTile label="Pełne" value={summary.full} />
			<StatTile label="Częściowe" value={summary.partial} />
		</dl>
	);
}
