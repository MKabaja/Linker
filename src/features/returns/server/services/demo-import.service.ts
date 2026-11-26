import 'server-only';
import type { DemoReturn } from '@/features/returns/model/demo-import.schemas';
import {
	parseDemoRecords,
	toImportedReturn,
} from '@/features/returns/server/mappers/demo-return.mapper';
import {
	findExistingReturnsByOrderIds,
	insertReturnIfAbsent,
} from '@/features/returns/server/repositories/returns.repository';

type DemoImportSummary = {
	total: number;
	invalid: number;
	/** Zamówienia, które już mają zwrot w bazie albo powtarzają się w pliku. */
	alreadyExisting: number;
	/** W podglądzie: ile zostałoby zaimportowanych. */
	imported: number;
};

type DemoImportPlan = {
	newRecords: DemoReturn[];
	summary: DemoImportSummary;
};

/**
 * Liczy, ile zwrotów z pliku demo trafiłoby do bazy, bez zapisu.
 */
async function previewDemoImport(
	rawRecords: unknown[],
): Promise<DemoImportSummary> {
	const { summary } = await planDemoImport(rawRecords);
	return summary;
}

/**
 * Zapisuje zwroty z pliku demo jako `imported`, bez pracownika, z datami i ilościami z pliku.
 *
 * @remarks
 * Idempotentny: zamówienie, które ma już zwrot, jest pomijane i liczone jako `alreadyExisting`.
 * Każdy zwrot zapisuje się w osobnej transakcji, więc przerwany import można bezpiecznie powtórzyć.
 */
async function importDemoReturns(
	rawRecords: unknown[],
): Promise<DemoImportSummary> {
	const { newRecords, summary } = await planDemoImport(rawRecords);
	let imported = 0;

	for (const record of newRecords) {
		const returnId = await insertReturnIfAbsent(toImportedReturn(record));

		if (returnId !== null) {
			imported += 1;
		}
	}

	return {
		...summary,
		alreadyExisting: summary.alreadyExisting + newRecords.length - imported,
		imported,
	};
}

async function planDemoImport(rawRecords: unknown[]): Promise<DemoImportPlan> {
	const { records, invalidIndexes } = parseDemoRecords(rawRecords);
	const existingReturnByOrderId = await findExistingReturnsByOrderIds(
		records.map((record) => record.orderId),
	);
	const plannedOrderIds = new Set<number>();
	const newRecords = records.filter((record) => {
		const isNew =
			!existingReturnByOrderId.has(record.orderId) &&
			!plannedOrderIds.has(record.orderId);
		plannedOrderIds.add(record.orderId);
		return isNew;
	});

	return {
		newRecords,
		summary: {
			total: rawRecords.length,
			invalid: invalidIndexes.length,
			alreadyExisting: records.length - newRecords.length,
			imported: newRecords.length,
		},
	};
}

export { type DemoImportSummary, importDemoReturns, previewDemoImport };
