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

export type PrimaveraErrorCode =
	| 'MISSING_TOKEN'
	| 'UNAUTHORIZED'
	| 'UNAVAILABLE'
	| 'EMPTY_RESPONSE'
	| 'INVALID_FORMAT'
	| 'UNKNOWN';

export type PrimaveraProductsFailure = {
	status: 'error';
	code: PrimaveraErrorCode;
};

export type PrimaveraProductsSuccess = {
	status: 'ok';
	products: PrimaveraProduct[];
	fetchedAt: Date;
};

export type PrimaveraProductsResult =
	| PrimaveraProductsSuccess
	| PrimaveraProductsFailure;

export type PrimaveraProductsPageQuery = {
	query: string;
	page: number;
};

export type PrimaveraProductsPageSuccess = {
	status: 'ok';
	products: PrimaveraProduct[];
	totalCount: number;
	page: number;
	pageCount: number;
	fetchedAt: Date;
};

export type PrimaveraProductsPageResult =
	| PrimaveraProductsPageSuccess
	| PrimaveraProductsFailure;

export type PrimaveraCsvRow = z.input<typeof primaveraCsvRowSchema>;

export type ValidPrimaveraCsvRow = z.output<typeof primaveraCsvRowSchema>;
