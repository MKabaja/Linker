import type { ParseConfig } from 'papaparse';
import { parse } from 'papaparse';
import type { PvexCsvRow } from './pvex.types';

const config = {
	header: true,
	delimiter: ';',
	skipEmptyLines: true,
} satisfies ParseConfig;

export function parsePvexCsv(csvContent: string) {
	return parse<PvexCsvRow>(csvContent, config);
}
