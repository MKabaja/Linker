import type { z } from 'zod';
import type { primaveraCsvRowSchema } from './products.schemas';

export type PrimaveraProduct = {
	ean: string;
	name: string;
	searchableName: string;
	price: number;
	quantity: number;
	vat: number;
};

export type PrimaveraProductsSnapshot = {
	products: PrimaveraProduct[];
	fetchedAt: Date;
};

export type PrimaveraProductsResult =
	| ({ status: 'ok' } & PrimaveraProductsSnapshot)
	| { status: 'error'; message: string };

export type PrimaveraProductsPage = {
	products: PrimaveraProduct[];
	totalCount: number;
	page: number;
	pageCount: number;
};

export type PrimaveraProductsPageQuery = {
	query: string;
	page: number;
};

export type PrimaveraProductsPageResult =
	| ({ status: 'ok'; fetchedAt: Date } & PrimaveraProductsPage)
	| { status: 'error'; message: string };

export type PrimaveraCsvRow = z.input<typeof primaveraCsvRowSchema>;

export type ValidPrimaveraCsvRow = z.output<typeof primaveraCsvRowSchema>;
