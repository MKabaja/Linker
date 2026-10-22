'use client';

import { useTable } from '@tanstack/react-table';
import { cn } from '@/shared/lib/utils';
import type { PrimaveraProduct } from '../../products.types';
import {
	productsTableColumns,
	productsTableFeatures,
} from './products-table.columns';
import {
	productsTableColumnStyles,
	productsTableStyles,
} from './products-table.styles';

type ProductsTableProps = {
	products: PrimaveraProduct[];
};

export function ProductsTable({ products }: ProductsTableProps) {
	const table = useTable({
		features: productsTableFeatures,
		columns: productsTableColumns,
		data: products,
		getRowId: getProductRowId,
	});

	return (
		<div className={productsTableStyles.wrapper}>
			<table className={productsTableStyles.table}>
				<caption className={productsTableStyles.caption}>
					Produkty z Primavery
				</caption>
				<thead className={productsTableStyles.head}>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									scope="col"
									className={cn(
										productsTableStyles.headerCell,
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
				<tbody>
					{table.getRowModel().rows.map((row) => (
						<tr key={row.id} className={productsTableStyles.row}>
							{row.getAllCells().map((cell) => (
								<td
									key={cell.id}
									className={cn(
										productsTableStyles.cell,
										productsTableColumnStyles[cell.column.id],
									)}
								>
									<table.FlexRender cell={cell} />
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function getProductRowId(product: PrimaveraProduct): string {
	return product.ean;
}
