'use client';

import { useTable } from '@tanstack/react-table';
import type { PrimaveraProduct } from '@/features/products/model/products.types';
import { cn } from '@/shared/lib/utils';
import {
	productsTableColumns,
	productsTableFeatures,
} from './products-table.columns';
import { ProductsTableSkeletonRows } from './products-table.skeleton-rows';
import {
	productsTableColumnStyles,
	productsTableStyles,
} from './products-table.styles';

type ProductsTableProps =
	| { status: 'loading' }
	| { status: 'ready'; products: PrimaveraProduct[] };

const noProducts: PrimaveraProduct[] = [];

export function ProductsTable(props: ProductsTableProps) {
	const {
		wrapper,
		tableElement,
		caption,
		head,
		headerCell,
		loadedBody,
		bodyRow,
		bodyCell,
	} = productsTableStyles;

	const isLoading = props.status === 'loading';

	const table = useTable({
		features: productsTableFeatures,
		columns: productsTableColumns,
		data: props.status === 'ready' ? props.products : noProducts,
		getRowId: getProductRowId,
	});

	return (
		<div className={wrapper} aria-busy={isLoading}>
			<table className={tableElement}>
				<caption className={caption}>Produkty z Primavery</caption>
				<thead className={head}>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									scope="col"
									className={cn(
										headerCell,
										productsTableColumnStyles[header.column.id],
									)}
								>
									{header.isPlaceholder ? null : (
										<table.FlexRender header={header} />
									)}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody className={isLoading ? undefined : loadedBody}>
					{isLoading ? (
						<ProductsTableSkeletonRows
							columnIds={table.getAllLeafColumns().map((column) => column.id)}
						/>
					) : (
						table.getRowModel().rows.map((row) => (
							<tr key={row.id} className={bodyRow}>
								{row.getAllCells().map((cell) => (
									<td
										key={cell.id}
										className={cn(
											bodyCell,
											productsTableColumnStyles[cell.column.id],
										)}
									>
										<table.FlexRender cell={cell} />
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

function getProductRowId(product: PrimaveraProduct): string {
	return product.ean;
}
