import { createColumnHelper, tableFeatures } from '@tanstack/react-table';
import type { PrimaveraProduct } from '@/features/products/model/products.types';
import {
	formatPriceAmount,
	formatPriceWithCurrency,
} from '@/features/products/utils/format-price';
import { CopyValueButton } from '../copy-value-button';

export const productsTableFeatures = tableFeatures({});

const columnHelper = createColumnHelper<
	typeof productsTableFeatures,
	PrimaveraProduct
>();

export const productsTableColumns = columnHelper.columns([
	columnHelper.accessor('ean', {
		header: 'EAN',
		cell: (info) => (
			<CopyValueButton label="EAN" value={info.getValue()}>
				{info.getValue()}
			</CopyValueButton>
		),
	}),
	columnHelper.accessor('name', {
		header: 'Nazwa',
	}),
	columnHelper.accessor('price', {
		header: 'Cena',
		cell: (info) => (
			<CopyValueButton label="cenę" value={formatPriceAmount(info.getValue())}>
				{formatPriceWithCurrency(info.getValue())}
			</CopyValueButton>
		),
	}),
	columnHelper.accessor('quantity', {
		header: 'Ilość',
	}),
	columnHelper.accessor('vat', {
		header: 'VAT',
		cell: (info) => (
			<CopyValueButton label="VAT" value={String(info.getValue())}>
				{info.getValue()}%
			</CopyValueButton>
		),
	}),
]);
