import { Skeleton } from '@/shared/components/skeleton';
import {
	returnsDayTableSkeletonStyles,
	returnsDayTableStyles,
} from './returns-day-table.styles';

const SKELETON_ROW_COUNT = 8;

const skeletonRowKeys = Array.from(
	{ length: SKELETON_ROW_COUNT },
	(_, rowIndex) => `skeleton-row-${rowIndex}`,
);

export function ReturnsDayTableSkeleton() {
	return (
		<div className={returnsDayTableStyles.wrapper} aria-busy="true">
			{skeletonRowKeys.map((rowKey) => (
				<div key={rowKey} className={returnsDayTableSkeletonStyles.row}>
					<Skeleton className="h-5 w-full" />
				</div>
			))}
		</div>
	);
}
