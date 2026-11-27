import { Download, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { CopyOrderIdsButton } from '@/features/returns/components/copy-order-ids-button';
import { ReturnsDatePicker } from '@/features/returns/components/returns-date-picker';
import { buttonVariants } from '@/shared/components/button';
import { returnsDayToolbarStyles } from './returns-day-toolbar.styles';

type ReturnsDayToolbarProps = { date: string; orderIds: number[] };

export function ReturnsDayToolbar({ date, orderIds }: ReturnsDayToolbarProps) {
	const { root, actions } = returnsDayToolbarStyles;

	return (
		<div className={root}>
			<ReturnsDatePicker date={date} />
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
