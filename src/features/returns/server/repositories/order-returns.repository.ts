import 'server-only';
import {
	and,
	desc,
	eq,
	gt,
	gte,
	inArray,
	isNull,
	notExists,
	sql,
} from 'drizzle-orm';
import { db } from '@/database/client';
import { indexedOrderReturns } from '@/database/schema/indexed-order-returns.schema';
import { returns } from '@/database/schema/returns.schema';
import type {
	OrderReturnRecord,
	PendingOrderReturn,
} from '@/features/returns/model/order-returns.types';
import { indexOrderIdsByReturnReference } from '@/features/returns/utils/return-reference';

const WRITE_BATCH_SIZE = 200;

type UpsertOrderReturns = { records: OrderReturnRecord[]; syncedAt: Date };

type PendingReturnsQuery = { since: Date };

/**
 * Zapisuje zwroty z modułu zwrotów BaseLinkera (upsert po `return_id`).
 *
 * @remarks Zapis w porcjach po 200.
 */
async function upsertOrderReturns({
	records,
	syncedAt,
}: UpsertOrderReturns): Promise<void> {
	for (let start = 0; start < records.length; start += WRITE_BATCH_SIZE) {
		const batch = records.slice(start, start + WRITE_BATCH_SIZE);

		await db
			.insert(indexedOrderReturns)
			.values(batch.map((record) => ({ ...record, syncedAt })))
			.onConflictDoUpdate({
				target: indexedOrderReturns.returnId,
				set: {
					orderId: excluded('order_id'),
					referenceNumber: excluded('reference_number'),
					packageNumber: excluded('package_number'),
					packageModule: excluded('package_module'),
					source: excluded('source'),
					statusId: excluded('status_id'),
					fullName: excluded('full_name'),
					postcode: excluded('postcode'),
					products: excluded('products'),
					dateAdd: excluded('date_add'),
					syncedAt: excluded('synced_at'),
				},
			});
	}
}

/**
 * Zwraca zamówienia zwrotów o podanych numerach referencyjnych (np. `NZ5J/2026`).
 *
 * @returns Mapa: kod wielkimi literami na `order_id`; przy powtórzonym kodzie wygrywa najnowszy zwrot.
 * @remarks Dopasowanie dokładne, bez rozróżniania wielkości liter i białych znaków na brzegach.
 */
async function findOrderIdsByReturnReference(
	references: string[],
): Promise<Map<string, number>> {
	const lowerCaseReferences = references
		.map((reference) => reference.trim().toLowerCase())
		.filter(Boolean);

	if (lowerCaseReferences.length === 0) {
		return new Map();
	}

	const rows = await db
		.select({
			referenceNumber: indexedOrderReturns.referenceNumber,
			orderId: indexedOrderReturns.orderId,
		})
		.from(indexedOrderReturns)
		.where(
			inArray(
				sql<string>`lower(${indexedOrderReturns.referenceNumber})`,
				lowerCaseReferences,
			),
		)
		.orderBy(desc(indexedOrderReturns.dateAdd));

	return indexOrderIdsByReturnReference(rows);
}

/**
 * Zwraca zwroty z modułu zwrotów BaseLinkera dodane od `since`, dla których nie ma jeszcze przyjęcia:
 * brak aktywnego (nieusuniętego) zwrotu tego zamówienia utworzonego po dacie dodania zwrotu BL. Najnowsze pierwsze.
 */
async function findPendingReturns({
	since,
}: PendingReturnsQuery): Promise<PendingOrderReturn[]> {
	return db
		.select({
			returnId: indexedOrderReturns.returnId,
			orderId: indexedOrderReturns.orderId,
			referenceNumber: indexedOrderReturns.referenceNumber,
			packageNumber: indexedOrderReturns.packageNumber,
			fullName: indexedOrderReturns.fullName,
			postcode: indexedOrderReturns.postcode,
			products: indexedOrderReturns.products,
			dateAdd: indexedOrderReturns.dateAdd,
			source: indexedOrderReturns.source,
		})
		.from(indexedOrderReturns)
		.where(
			and(
				gte(indexedOrderReturns.dateAdd, since),
				notExists(
					db
						.select({ id: returns.id })
						.from(returns)
						.where(
							and(
								eq(returns.orderId, indexedOrderReturns.orderId),
								isNull(returns.deletedAt),
								gt(returns.createdAt, indexedOrderReturns.dateAdd),
							),
						),
				),
			),
		)
		.orderBy(desc(indexedOrderReturns.dateAdd));
}

function excluded(columnName: string) {
	return sql.raw(`excluded.${columnName}`);
}

export {
	findOrderIdsByReturnReference,
	findPendingReturns,
	upsertOrderReturns,
};
