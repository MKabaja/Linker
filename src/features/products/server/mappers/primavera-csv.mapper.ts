import 'server-only';
import type { ParseConfig, ParseError } from 'papaparse';
import { parse } from 'papaparse';
import { primaveraCsvRowSchema } from '@/features/products/model/products.schemas';
import type {
	PrimaveraCsvRow,
	PrimaveraProduct,
	ValidPrimaveraCsvRow,
} from '@/features/products/model/products.types';
import { normalizeSearchText } from '@/features/products/utils/normalize-search-text';

type RowsValidation = {
	validRows: ValidPrimaveraCsvRow[];
	skippedRowIndexes: number[];
};

const config = {
	header: true,
	delimiter: ';',
	skipEmptyLines: true,
} satisfies ParseConfig;

const PRIMAVERA_CSV_HEADERS = primaveraCsvRowSchema.keyof().options;

export function parsePrimaveraCsv(csvContent: string): PrimaveraProduct[] {
	const result = parse<PrimaveraCsvRow>(csvContent, config);
	assertPrimaveraCsvHeaders(result.meta.fields);
	assertNoStructuralErrors(result.errors);

	const { validRows, skippedRowIndexes } = validateRows(
		result.data,
		getMalformedRowIndexes(result.errors),
	);
	warnAboutSkippedRows(skippedRowIndexes);

	return validRows.map(mapToPrimaveraProduct);
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

function assertNoStructuralErrors(resultErrors: ParseError[]) {
	const structuralErrors = resultErrors.filter((e) => e.row === undefined);

	if (structuralErrors.length > 0) {
		throw new Error(
			`Błąd struktury pliku CSV: ${structuralErrors.map((e) => e.message).join('; ')}`,
		);
	}
}

function validateRows(
	csvRows: PrimaveraCsvRow[],
	malformedRowIndexes: Set<number>,
): RowsValidation {
	const validRows: ValidPrimaveraCsvRow[] = [];
	const skippedRowIndexes: number[] = [];

	csvRows.forEach((csvRow, index) => {
		const validation = primaveraCsvRowSchema.safeParse(csvRow);

		if (malformedRowIndexes.has(index) || !validation.success) {
			skippedRowIndexes.push(index);
			return;
		}

		validRows.push(validation.data);
	});

	return { validRows, skippedRowIndexes };
}

function getMalformedRowIndexes(resultErrors: ParseError[]): Set<number> {
	return new Set(
		resultErrors
			.map((e) => e.row)
			.filter((row): row is number => row !== undefined),
	);
}

function warnAboutSkippedRows(skippedRowIndexes: number[]) {
	if (skippedRowIndexes.length > 0) {
		console.warn(
			`Pominięto wadliwe wiersze CSV (${skippedRowIndexes.length}): ${skippedRowIndexes.join(', ')}`,
		);
	}
}

function mapToPrimaveraProduct(csvRow: ValidPrimaveraCsvRow): PrimaveraProduct {
	return {
		ean: csvRow.EAN,
		name: csvRow.Nazwa,
		searchableName: normalizeSearchText(csvRow.Nazwa),
		price: csvRow.Cena,
		quantity: csvRow.Ilosc,
		vat: csvRow.StawkaVAT,
	};
}
