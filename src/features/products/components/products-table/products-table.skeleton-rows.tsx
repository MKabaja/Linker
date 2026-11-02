import { Skeleton } from '@/shared/components/skeleton';
import { cn } from '@/shared/lib/utils';
import {
	productsTableColumnStyles,
	productsTableSkeletonStyles,
	productsTableStyles,
} from './products-table.styles';

type ProductsTableSkeletonRowsProps = {
	columnIds: string[];
};

const SKELETON_ROW_COUNT = 12;

const skeletonRowKeys = Array.from(
	{ length: SKELETON_ROW_COUNT },
	(_, rowIndex) => `skeleton-row-${rowIndex}`,
);

export function ProductsTableSkeletonRows({
	columnIds,
}: ProductsTableSkeletonRowsProps) {
	const { bodyRow, bodyCell } = productsTableStyles;

	return skeletonRowKeys.map((rowKey) => (
		<tr key={rowKey} className={bodyRow}>
			{columnIds.map((columnId) => (
				<td
					key={columnId}
					className={cn(bodyCell, productsTableColumnStyles[columnId])}
				>
					<Skeleton className={productsTableSkeletonStyles[columnId]} />
				</td>
			))}
		</tr>
	));
}
