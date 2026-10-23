'use client';

import { useTable } from '@tanstack/react-table';
import type { PrimaveraProduct } from '@/features/products/model/products.types';
import { cn } from '@/shared/lib/utils';
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
	const {
		wrapper,
		tableElement,
		caption,
		head,
		headerCell,
		bodyRow,
		bodyCell,
	} = productsTableStyles;

	const table = useTable({
		features: productsTableFeatures,
		columns: productsTableColumns,
		data: products,
		getRowId: getProductRowId,
	});

	return (
		<div className={wrapper}>
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
				<tbody>
					{table.getRowModel().rows.map((row) => (
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
					))}
				</tbody>
			</table>
		</div>
	);
}

function getProductRowId(product: PrimaveraProduct): string {
	return product.ean;
}
