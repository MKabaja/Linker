import { ChartColumn, Download, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { CopyOrderIdsButton } from '@/features/returns/components/copy-order-ids-button';
import { ReturnsCorrectionFilterNav } from '@/features/returns/components/returns-correction-filter';
import { ReturnsDatePicker } from '@/features/returns/components/returns-date-picker';
import { ReturnsSortSelect } from '@/features/returns/components/returns-sort-select';
import { buttonVariants } from '@/shared/components/button';
import type { ReturnsListScope } from '@/features/returns/model/returns-list.types';
import { returnsDayToolbarStyles } from './returns-day-toolbar.styles';

type ReturnsDayToolbarProps = {
	scope: ReturnsListScope & { date: string };
	orderIds: number[];
};

export function ReturnsDayToolbar({ scope, orderIds }: ReturnsDayToolbarProps) {
	const { root, filters, actions } = returnsDayToolbarStyles;
	const { date } = scope;

	return (
		<div className={root}>
			<div className={filters}>
				<ReturnsDatePicker scope={scope} />
				<ReturnsCorrectionFilterNav scope={scope} />
				<ReturnsSortSelect scope={scope} />
			</div>
			<div className={actions}>
				<Link
					href="/returns/scan"
					className={buttonVariants({ variant: 'accent' })}
				>
					<ScanLine />
					Skanuj
				</Link>
				<CopyOrderIdsButton orderIds={orderIds} />
				<a
					href={`/api/returns/export?date=${date}`}
					download
					className={buttonVariants({ variant: 'outline' })}
				>
					<Download />
					Eksport CSV
				</a>
				<Link
					href="/returns/stats"
					className={buttonVariants({ variant: 'outline' })}
				>
					<ChartColumn />
					Statystyki
				</Link>
			</div>
		</div>
	);
}
