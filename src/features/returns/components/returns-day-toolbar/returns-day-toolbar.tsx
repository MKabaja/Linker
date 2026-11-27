import { Download, ScanLine } from 'lucide-react';
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
	const { root, actions } = returnsDayToolbarStyles;
	const { date } = scope;

	return (
		<div className={root}>
			<ReturnsDatePicker scope={scope} />
			<ReturnsSortSelect scope={scope} />
			<ReturnsCorrectionFilterNav scope={scope} />
			<div className={actions}>
				<CopyOrderIdsButton orderIds={orderIds} />
				<a
					href={`/api/returns/export?date=${date}`}
					download
					className={buttonVariants({ variant: 'default' })}
				>
					<Download />
					Eksport CSV
				</a>
				<Link
					href="/returns/stats"
					className={buttonVariants({ variant: 'ghost' })}
				>
					Statystyki
				</Link>
				<Link
					href="/returns/scan"
					className={buttonVariants({ variant: 'accent' })}
				>
					<ScanLine />
					Skanuj
				</Link>
			</div>
		</div>
	);
}
