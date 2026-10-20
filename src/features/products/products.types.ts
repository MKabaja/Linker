import type { PRIMAVERA_CSV_HEADERS } from './constants/csv.constants';

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

export type PrimaveraCsvRow = Record<
	(typeof PRIMAVERA_CSV_HEADERS)[number],
	string
>;
