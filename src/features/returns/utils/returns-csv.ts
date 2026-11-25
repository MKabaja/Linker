import Papa from 'papaparse';
import {
	conditionLabelByCondition,
	returnKindLabelByKind,
} from '@/features/returns/model/returns.constants';
import type {
	ReturnItem,
	ReturnRecord,
} from '@/features/returns/model/returns.types';
import { formatWarsawTime } from '@/shared/lib/warsaw-time';

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

const CSV_HEADER = [
	'ID_BASE',
	'Źródło',
	'Rodzaj',
	'Co zwrócono',
	'Notatka',
	'Godzina',
	'Przyjął',
];

/**
 * Buduje CSV zwrotów dla Excela w polskiej wersji: BOM, średniki, wiersze `\r\n`, godziny w strefie Europe/Warsaw.
 *
 * @remarks Komórki zaczynające się od `=`, `+`, `-`, `@` dostają apostrof, żeby Excel nie wykonał ich jako formuły.
 */
export function buildReturnsCsv(returns: ReturnRecord[]): string {
	const rows = returns.map((returnRecord) => [
		String(returnRecord.orderId),
		returnRecord.source,
		returnKindLabelByKind[returnRecord.kind],
		describeReturnedItems(returnRecord.items),
		returnRecord.note,
		formatWarsawTime(returnRecord.createdAt),
		returnRecord.receivedBy.name,
	]);
	const csv = Papa.unparse(
		{ fields: CSV_HEADER, data: rows },
		{ delimiter: ';', newline: '\r\n', escapeFormulae: true },
	);

	return `${BYTE_ORDER_MARK}${csv}`;
}

function describeReturnedItems(items: ReturnItem[]): string {
	return items
		.filter((item) => item.quantityReceived > 0)
		.map((item) => {
			const damagedSuffix =
				item.condition === 'damaged'
					? ` (${conditionLabelByCondition.damaged})`
					: '';
			return `${item.name} ×${item.quantityReceived}${damagedSuffix}`;
		})
		.join(', ');
}
