import type { ParseConfig, ParseError } from 'papaparse';
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
	assertNoStructuralErrors(result.errors);
	const badRows = getBadRowIndexes(result.errors);
	warnAboutSkippedRows(badRows);

	return result.data
		.filter((_row, index) => !badRows.has(index))
		.map(mapToPvexProduct);
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

function assertNoStructuralErrors(resultErrors: ParseError[]) {
	const structuralErrors = resultErrors.filter((e) => e.row === undefined);

	if (structuralErrors.length > 0) {
		throw new Error(
			`Błąd struktury pliku CSV: ${structuralErrors.map((e) => e.message).join('; ')}`,
		);
	}
}

function warnAboutSkippedRows(badRows: Set<number>) {
	if (badRows.size > 0) {
		console.warn(
			`Pominięto wadliwe wiersze CSV (${badRows.size}): ${[...badRows].join(', ')}`,
		);
	}
}

function getBadRowIndexes(resultErrors: ParseError[]): Set<number> {
	return new Set(
		resultErrors
			.map((e) => e.row)
			.filter((row): row is number => row !== undefined),
	);
}
