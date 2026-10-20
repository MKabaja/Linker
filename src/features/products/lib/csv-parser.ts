import type { ParseConfig, ParseError } from 'papaparse';
import { parse } from 'papaparse';
import { PRIMAVERA_CSV_HEADERS, SEPARATOR } from '../constants/csv.constants';
import type { PrimaveraCsvRow, PrimaveraProduct } from '../products.types';

const config = {
	header: true,
	delimiter: SEPARATOR,
	skipEmptyLines: true,
} satisfies ParseConfig;

export function parsePrimaveraCsv(csvContent: string): PrimaveraProduct[] {
	const result = parse<PrimaveraCsvRow>(csvContent, config);
	assertPrimaveraCsvHeaders(result.meta.fields);
	assertNoStructuralErrors(result.errors);
	const badRows = getBadRowIndexes(result.errors);
	warnAboutSkippedRows(badRows);

	return result.data
		.filter((_row, index) => !badRows.has(index))
		.map(mapToPrimaveraProduct);
}

function assertPrimaveraCsvHeaders(fields: string[] | undefined) {
	const fieldSet = new Set(fields);
	const missing = PRIMAVERA_CSV_HEADERS.filter(
		(header) => !fieldSet.has(header),
	);

	if (missing.length > 0) {
		throw new Error(`Brakujące nagłówki w pliku CSV: ${missing.join(', ')}`);
	}
}

function mapToPrimaveraProduct(csvRow: PrimaveraCsvRow): PrimaveraProduct {
	return {
		ean: csvRow.EAN,
		name: csvRow.Nazwa,
		searchableName: csvRow.Nazwa.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\u0142/g, 'l'),
		price: Number(csvRow.Cena),
		quantity: Number(csvRow.Ilosc),
		vat: Number(csvRow.StawkaVAT),
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
