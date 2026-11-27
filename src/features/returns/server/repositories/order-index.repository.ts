import 'server-only';
import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	inArray,
	isNull,
	lt,
	notExists,
	or,
	sql,
} from 'drizzle-orm';
import { db } from '@/database/client';
import { indexedOrderItems } from '@/database/schema/indexed-order-items.schema';
import { indexedOrders } from '@/database/schema/indexed-orders.schema';
import { indexedPackages } from '@/database/schema/indexed-packages.schema';
import type {
	IndexedPackage,
	OrderIndexEntry,
} from '@/features/returns/model/order-index.types';
import type { IndexedOrder } from '@/features/returns/model/order-scoring.types';
import { normalizeCode } from '@/features/returns/utils/normalize-text';

const WRITE_BATCH_SIZE = 200;
const MILLISECONDS_PER_SECOND = 1000;

type UpsertOrders = { entries: OrderIndexEntry[]; syncedAt: Date };

type ReplacePackages = {
	orderId: number;
	packages: IndexedPackage[];
	checkedAt: Date;
};

type PendingPackagesQuery = {
	limit: number;
	/** Świeże zamówienia bez paczki sprawdzone przed tą chwilą są sprawdzane ponownie. */
	recheckCheckedBefore: Date;
	/** Ponowne sprawdzanie tylko dla zamówień potwierdzonych od tej chwili. */
	recheckConfirmedFrom: Date;
};

const orderDate = sql`coalesce(${indexedOrders.dateConfirmed}, ${indexedOrders.dateAdd})`;

/**
 * Zapisuje zamówienia (upsert po `order_id`), zastępuje ich pozycje i dopisuje przesyłki.
 *
 * @remarks Nie zmienia `packages_synced_at` ani przesyłek, których nie ma we wpisach. Zapis w porcjach po 200, każda w transakcji.
 */
async function upsertIndexedOrders({
	entries,
	syncedAt,
}: UpsertOrders): Promise<void> {
	for (let start = 0; start < entries.length; start += WRITE_BATCH_SIZE) {
		await upsertBatch(entries.slice(start, start + WRITE_BATCH_SIZE), syncedAt);
	}
}

async function upsertBatch(entries: OrderIndexEntry[], syncedAt: Date) {
	if (entries.length === 0) {
		return;
	}

	const orderIds = entries.map(({ order }) => order.orderId);
	const itemRows = entries.flatMap(({ order, items }) =>
		items.map((item) => ({ ...item, orderId: order.orderId })),
	);
	const packageRows = entries.flatMap(({ order, packages }) =>
		packages.map((indexedPackage) => ({
			...indexedPackage,
			orderId: order.orderId,
		})),
	);

	await db.transaction(async (transaction) => {
		await transaction
			.insert(indexedOrders)
			.values(entries.map(({ order }) => toOrderRow(order, syncedAt)))
			.onConflictDoUpdate({
				target: indexedOrders.orderId,
				set: {
					externalOrderId: excluded('external_order_id'),
					orderSource: excluded('order_source'),
					orderSourceId: excluded('order_source_id'),
					orderStatusId: excluded('order_status_id'),
					dateAdd: excluded('date_add'),
					dateConfirmed: excluded('date_confirmed'),
					firstNameNormalized: excluded('first_name_normalized'),
					lastNameNormalized: excluded('last_name_normalized'),
					phoneDigits: excluded('phone_digits'),
					postcode: excluded('postcode'),
					cityNormalized: excluded('city_normalized'),
					waproOrderNumber: excluded('wapro_order_number'),
					wmsCode: excluded('wms_code'),
					syncedAt: excluded('synced_at'),
				},
			});
		await transaction
			.delete(indexedOrderItems)
			.where(inArray(indexedOrderItems.orderId, orderIds));

		if (itemRows.length > 0) {
			await transaction.insert(indexedOrderItems).values(itemRows);
		}

		if (packageRows.length > 0) {
			await transaction
				.insert(indexedPackages)
				.values(packageRows)
				.onConflictDoUpdate({
					target: [indexedPackages.orderId, indexedPackages.packageNumber],
					set: {
						innerNumber: sql`coalesce(nullif(excluded.inner_number, ''), ${indexedPackages.innerNumber})`,
						courierCode: sql`coalesce(nullif(excluded.courier_code, ''), ${indexedPackages.courierCode})`,
					},
				});
		}
	});
}

/**
 * Zastępuje wszystkie przesyłki zamówienia i oznacza je jako sprawdzone.
 */
async function replaceOrderPackages({
	orderId,
	packages,
	checkedAt,
}: ReplacePackages): Promise<void> {
	await db.transaction(async (transaction) => {
		await transaction
			.delete(indexedPackages)
			.where(eq(indexedPackages.orderId, orderId));

		if (packages.length > 0) {
			await transaction
				.insert(indexedPackages)
				.values(
					packages.map((indexedPackage) => ({ ...indexedPackage, orderId })),
				);
		}

		await transaction
			.update(indexedOrders)
			.set({ packagesSyncedAt: checkedAt })
			.where(eq(indexedOrders.orderId, orderId));
	});
}

async function markPackagesChecked(orderIds: number[], checkedAt: Date) {
	if (orderIds.length === 0) {
		return;
	}

	await db
		.update(indexedOrders)
		.set({ packagesSyncedAt: checkedAt })
		.where(inArray(indexedOrders.orderId, orderIds));
}

/**
 * Zwraca zamówienia do pobrania przesyłek, najnowsze pierwsze: jeszcze niesprawdzone
 * oraz świeże bez żadnej przesyłki, sprawdzone dawno (przesyłka powstaje zwykle po potwierdzeniu).
 */
async function findOrderIdsPendingPackages({
	limit,
	recheckCheckedBefore,
	recheckConfirmedFrom,
}: PendingPackagesQuery): Promise<number[]> {
	const rows = await db
		.select({ orderId: indexedOrders.orderId })
		.from(indexedOrders)
		.where(
			or(
				isNull(indexedOrders.packagesSyncedAt),
				and(
					lt(indexedOrders.packagesSyncedAt, recheckCheckedBefore),
					gte(indexedOrders.dateConfirmed, recheckConfirmedFrom),
					notExists(
						db
							.select({ id: indexedPackages.id })
							.from(indexedPackages)
							.where(eq(indexedPackages.orderId, indexedOrders.orderId)),
					),
				),
			),
		)
		.orderBy(desc(orderDate))
		.limit(limit);

	return rows.map((row) => row.orderId);
}

async function countOrdersPendingPackages(): Promise<number> {
	const [row] = await db
		.select({ total: count() })
		.from(indexedOrders)
		.where(isNull(indexedOrders.packagesSyncedAt));

	return row?.total ?? 0;
}

/**
 * Retencja: usuwa zamówienia potwierdzone (albo dodane, gdy niepotwierdzone) przed `before`
 * razem z pozycjami i przesyłkami.
 *
 * @returns Liczba usuniętych zamówień.
 */
async function deleteOrdersBefore(before: Date): Promise<number> {
	const deleted = await db
		.delete(indexedOrders)
		.where(lt(orderDate, before.toISOString()))
		.returning({ orderId: indexedOrders.orderId });

	return deleted.length;
}

async function deleteOrdersBySource(source: string): Promise<number> {
	const deleted = await db
		.delete(indexedOrders)
		.where(eq(indexedOrders.orderSource, source))
		.returning({ orderId: indexedOrders.orderId });

	return deleted.length;
}

/**
 * Wczytuje cały indeks w kształcie do punktacji (daty w sekundach, numery przesyłek bez powtórzeń).
 */
async function findAllIndexedOrders(): Promise<IndexedOrder[]> {
	const [orderRows, packageRows] = await Promise.all([
		db.select().from(indexedOrders),
		db
			.select({
				orderId: indexedPackages.orderId,
				packageNumber: indexedPackages.packageNumber,
				innerNumber: indexedPackages.innerNumber,
			})
			.from(indexedPackages),
	]);
	const packageNumbersByOrderId = new Map<number, Set<string>>();

	for (const { orderId, packageNumber, innerNumber } of packageRows) {
		const numbers = packageNumbersByOrderId.get(orderId) ?? new Set<string>();

		for (const number of [packageNumber, innerNumber]) {
			if (number) {
				numbers.add(number);
			}
		}

		packageNumbersByOrderId.set(orderId, numbers);
	}

	return orderRows.map((row) => ({
		orderId: row.orderId,
		externalOrderId: normalizeCode(row.externalOrderId),
		source: row.orderSource,
		statusId: row.orderStatusId,
		dateAdd: toUnixSeconds(row.dateAdd),
		dateConfirmed: row.dateConfirmed ? toUnixSeconds(row.dateConfirmed) : 0,
		phoneDigits: row.phoneDigits,
		firstNameNorm: row.firstNameNormalized,
		lastNameNorm: row.lastNameNormalized,
		postcode: row.postcode,
		cityNorm: row.cityNormalized,
		packageNumbers: [...(packageNumbersByOrderId.get(row.orderId) ?? [])],
	}));
}

/**
 * Zwraca zamówienie z indeksu z pozycjami i przesyłkami albo `null`, gdy go nie ma.
 */
async function findIndexedOrderEntry(
	orderId: number,
): Promise<OrderIndexEntry | null> {
	const [orderRow] = await db
		.select()
		.from(indexedOrders)
		.where(eq(indexedOrders.orderId, orderId))
		.limit(1);

	if (!orderRow) {
		return null;
	}

	const [itemRows, packageRows] = await Promise.all([
		db
			.select()
			.from(indexedOrderItems)
			.where(eq(indexedOrderItems.orderId, orderId))
			.orderBy(asc(indexedOrderItems.position)),
		db
			.select()
			.from(indexedPackages)
			.where(eq(indexedPackages.orderId, orderId))
			.orderBy(asc(indexedPackages.id)),
	]);

	return {
		order: {
			orderId: orderRow.orderId,
			externalOrderId: orderRow.externalOrderId,
			source: orderRow.orderSource,
			sourceId: orderRow.orderSourceId,
			statusId: orderRow.orderStatusId,
			dateAdd: orderRow.dateAdd,
			dateConfirmed: orderRow.dateConfirmed,
			firstNameNormalized: orderRow.firstNameNormalized,
			lastNameNormalized: orderRow.lastNameNormalized,
			phoneDigits: orderRow.phoneDigits,
			postcode: orderRow.postcode,
			cityNormalized: orderRow.cityNormalized,
			waproOrderNumber: orderRow.waproOrderNumber,
			wmsCode: orderRow.wmsCode,
		},
		items: itemRows.map(({ orderId: _orderId, ...item }) => item),
		packages: packageRows.map(
			({ packageNumber, innerNumber, courierCode }) => ({
				packageNumber,
				innerNumber,
				courierCode,
			}),
		),
	};
}

function toOrderRow(order: OrderIndexEntry['order'], syncedAt: Date) {
	return {
		orderId: order.orderId,
		externalOrderId: order.externalOrderId,
		orderSource: order.source,
		orderSourceId: order.sourceId,
		orderStatusId: order.statusId,
		dateAdd: order.dateAdd,
		dateConfirmed: order.dateConfirmed,
		firstNameNormalized: order.firstNameNormalized,
		lastNameNormalized: order.lastNameNormalized,
		phoneDigits: order.phoneDigits,
		postcode: order.postcode,
		cityNormalized: order.cityNormalized,
		waproOrderNumber: order.waproOrderNumber,
		wmsCode: order.wmsCode,
		syncedAt,
	};
}

function excluded(columnName: string) {
	return sql.raw(`excluded.${columnName}`);
}

function toUnixSeconds(date: Date): number {
	return Math.floor(date.getTime() / MILLISECONDS_PER_SECOND);
}

export {
	countOrdersPendingPackages,
	deleteOrdersBefore,
	deleteOrdersBySource,
	findAllIndexedOrders,
	findIndexedOrderEntry,
	findOrderIdsPendingPackages,
	markPackagesChecked,
	replaceOrderPackages,
	upsertIndexedOrders,
};
