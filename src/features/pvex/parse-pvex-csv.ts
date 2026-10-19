import type { ParseConfig } from 'papaparse';
import { parse } from 'papaparse';
import { PVEX_CSV_HEADERS, SEPARATOR } from './pvex.constants';
import type { PvexCsvRow, PvexProduct } from './pvex.types';

const config = {
	header: true,
	delimiter: SEPARATOR,
	skipEmptyLines: true,
} satisfies ParseConfig;

export function parsePvexCsv(csvContent: string): PvexProduct[] {
	const result = parse<PvexCsvRow>(csvContent, config);
	assertPvexCsvHeaders(result.meta.fields);
	return result.data.map(mapToPvexProduct);
}

function assertPvexCsvHeaders(fields: string[] | undefined) {
	const fieldSet = new Set(fields);
	const missing = PVEX_CSV_HEADERS.filter((header) => !fieldSet.has(header));

	if (missing.length > 0) {
		throw new Error(`Brakujące nagłówki w pliku CSV: ${missing.join(', ')}`);
	}
}

function mapToPvexProduct(pvexCsvRow: PvexCsvRow): PvexProduct {
	return {
		ean: pvexCsvRow.EAN,
		name: pvexCsvRow.Nazwa,
		searchableName: pvexCsvRow.Nazwa.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\u0142/g, 'l'),
		price: Number(pvexCsvRow.Cena),
		quantity: Number(pvexCsvRow.Ilosc),
		vat: Number(pvexCsvRow.StawkaVAT),
	};
}
