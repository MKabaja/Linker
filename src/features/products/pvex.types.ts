import type { PVEX_CSV_HEADERS } from './pvex.constants';

export type PvexProduct = {
	ean: string;
	name: string;
	searchableName: string;
	price: number;
	quantity: number;
	vat: number;
};

export type PvexCsvRow = Record<(typeof PVEX_CSV_HEADERS)[number], string>;
