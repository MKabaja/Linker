import 'server-only';
import {
	and,
	asc,
	desc,
	eq,
	gt,
	inArray,
	isNotNull,
	isNull,
	lt,
	or,
	type SQL,
	sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/database/client';
import { indexedOrders } from '@/database/schema/indexed-orders.schema';
import { returnEvents } from '@/database/schema/return-events.schema';
import { returnItems } from '@/database/schema/return-items.schema';
import { returns } from '@/database/schema/returns.schema';
import { users } from '@/database/schema/users.schema';
import type { NewReturn } from '@/features/returns/model/new-return.types';
import type { ExistingReturn } from '@/features/returns/model/order-search.types';
import { IMPORTED_RECEIVER_NAME } from '@/features/returns/model/return-origin.constants';
import type { UpdateReturn } from '@/features/returns/model/returns.schemas';
import { returnSnapshotSchema } from '@/features/returns/model/returns.schemas';
import type {
	ReturnEvent,
	ReturnEventKind,
	ReturnItem,
	ReturnNeighbors,
	ReturnRecord,
	ReturnSnapshot,
} from '@/features/returns/model/returns.types';
import { getReturnKind } from '@/features/returns/utils/return-kind';
import { WARSAW_TIME_ZONE } from '@/shared/lib/warsaw-time';

type ReturnChange = { update: UpdateReturn; userId: number; updatedAt: Date };

type NewEvent = {
	returnId: number;
	kind: ReturnEventKind;
	userId: number | null;
	createdAt: Date;
};

type SoftDeleteChange = { returnId: number; userId: number; deletedAt: Date };

type RestoreChange = { returnId: number; userId: number; restoredAt: Date };

type UpdateOutcome = 'updated' | 'deleted' | 'notFound';

type ExistingReturnByOrderId = Map<number, ExistingReturn>;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const deleter = alias(users, 'deleter');

const returnColumns = {
	id: returns.id,
	orderId: returns.orderId,
	source: returns.orderSource,
	waproOrderNumber: indexedOrders.waproOrderNumber,
	wmsCode: indexedOrders.wmsCode,
	note: returns.note,
	createdAt: returns.createdAt,
	updatedAt: returns.updatedAt,
	deletedAt: returns.deletedAt,
	deletedByName: deleter.name,
	receivedById: users.id,
	receivedByName: users.name,
};

const itemColumns = {
	id: returnItems.id,
	returnId: returnItems.returnId,
	orderProductId: returnItems.orderProductId,
	name: returnItems.name,
	ean: returnItems.ean,
	sku: returnItems.sku,
	quantityOrdered: returnItems.quantityOrdered,
	quantityReceived: returnItems.quantityReceived,
	condition: returnItems.condition,
};

type ReturnRow = {
	id: number;
	orderId: number;
	source: string;
	waproOrderNumber: string | null;
	wmsCode: string | null;
	note: string;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
	deletedByName: string | null;
	receivedById: number | null;
	receivedByName: string | null;
};

/**
 * Zapisuje zwrot z pozycjami i wpisem `created` w historii, w jednej transakcji.
 *
 * @returns Identyfikator zwrotu albo `null`, gdy zwrot dla tego zamówienia już istnieje (także przy równoległym zapisie).
 */
async function insertReturnIfAbsent(
	newReturn: NewReturn,
): Promise<number | null> {
	return db.transaction(async (transaction) => {
		const [inserted] = await transaction
			.insert(returns)
			.values({
				orderId: newReturn.orderId,
				orderSource: newReturn.source,
				note: newReturn.note,
				receivedBy: newReturn.receivedBy,
				matchedBy: newReturn.matchedBy,
				scannedLabel: newReturn.scannedLabel,
				createdAt: newReturn.createdAt,
				updatedAt: newReturn.updatedAt,
			})
			.onConflictDoNothing({ target: returns.orderId })
			.returning({ id: returns.id });

		if (!inserted) {
			return null;
		}

		if (newReturn.items.length > 0) {
			await transaction
				.insert(returnItems)
				.values(
					newReturn.items.map((item) => ({ ...item, returnId: inserted.id })),
				);
		}

		await insertEvent(transaction, {
			returnId: inserted.id,
			kind: 'created',
			userId: newReturn.receivedBy,
			createdAt: newReturn.createdAt,
		});

		return inserted.id;
	});
}

/**
 * Zmienia notatkę i pozycje zwrotu i dopisuje wpis `updated` z migawką stanu po zmianie.
 *
 * @remarks Pozycje spoza tego zwrotu są pomijane. Wiersz zwrotu jest blokowany do końca transakcji.
 * @returns `deleted`, gdy zwrot jest usunięty (bez zmian), `notFound`, gdy zwrotu nie ma.
 */
async function updateReturnWithEvent({
	update,
	userId,
	updatedAt,
}: ReturnChange): Promise<UpdateOutcome> {
	return db.transaction(async (transaction) => {
		const [locked] = await transaction
			.select({ id: returns.id, deletedAt: returns.deletedAt })
			.from(returns)
			.where(eq(returns.id, update.returnId))
			.for('update');

		if (!locked) {
			return 'notFound';
		}

		if (locked.deletedAt) {
			return 'deleted';
		}

		await transaction
			.update(returns)
			.set({ note: update.note, updatedAt })
			.where(eq(returns.id, update.returnId));

		for (const item of update.items ?? []) {
			await transaction
				.update(returnItems)
				.set({
					quantityReceived: item.quantityReceived,
					condition: item.condition,
				})
				.where(
					and(
						eq(returnItems.id, item.id),
						eq(returnItems.returnId, update.returnId),
					),
				);
		}

		await insertEvent(transaction, {
			returnId: update.returnId,
			kind: 'updated',
			userId,
			createdAt: updatedAt,
		});

		return 'updated';
	});
}

/**
 * Oznacza zwrot jako usunięty i dopisuje wpis `deleted` z migawką stanu. Zwrot zostaje w bazie i nadal blokuje nowy zwrot dla zamówienia.
 *
 * @returns `false`, gdy zwrotu nie ma albo jest już usunięty.
 */
async function softDeleteReturnWithEvent({
	returnId,
	userId,
	deletedAt,
}: SoftDeleteChange): Promise<boolean> {
	return db.transaction(async (transaction) => {
		const [changed] = await transaction
			.update(returns)
			.set({ deletedAt, deletedBy: userId })
			.where(and(eq(returns.id, returnId), isNull(returns.deletedAt)))
			.returning({ id: returns.id });

		if (!changed) {
			return false;
		}

		await insertEvent(transaction, {
			returnId,
			kind: 'deleted',
			userId,
			createdAt: deletedAt,
		});

		return true;
	});
}

/**
 * Przywraca usunięty zwrot i dopisuje wpis `restored`.
 *
 * @returns `false`, gdy zwrotu nie ma albo nie jest usunięty.
 */
async function restoreReturnWithEvent({
	returnId,
	userId,
	restoredAt,
}: RestoreChange): Promise<boolean> {
	return db.transaction(async (transaction) => {
		const [changed] = await transaction
			.update(returns)
			.set({ deletedAt: null, deletedBy: null })
			.where(and(eq(returns.id, returnId), isNotNull(returns.deletedAt)))
			.returning({ id: returns.id });

		if (!changed) {
			return false;
		}

		await insertEvent(transaction, {
			returnId,
			kind: 'restored',
			userId,
			createdAt: restoredAt,
		});

		return true;
	});
}

async function findReturnById(returnId: number): Promise<ReturnRecord | null> {
	const [record] = await findReturnRecords(eq(returns.id, returnId));
	return record ?? null;
}

async function findReturnByOrderId(
	orderId: number,
): Promise<ReturnRecord | null> {
	const [record] = await findReturnRecords(eq(returns.orderId, orderId));
	return record ?? null;
}

/**
 * Zwraca zwroty (także usunięte) dla podanych zamówień jednym zapytaniem.
 *
 * @returns Mapa po `order_id`; zamówień bez zwrotu w niej nie ma.
 */
async function findExistingReturnsByOrderIds(
	orderIds: number[],
): Promise<ExistingReturnByOrderId> {
	if (orderIds.length === 0) {
		return new Map();
	}

	const rows = await db
		.select({
			returnId: returns.id,
			orderId: returns.orderId,
			createdAt: returns.createdAt,
			receivedByName: users.name,
			deletedAt: returns.deletedAt,
			deletedByName: deleter.name,
		})
		.from(returns)
		.leftJoin(users, eq(users.id, returns.receivedBy))
		.leftJoin(deleter, eq(deleter.id, returns.deletedBy))
		.where(inArray(returns.orderId, orderIds));

	return new Map(
		rows.map((row) => [
			row.orderId,
			{
				returnId: row.returnId,
				receivedAt: row.createdAt.toISOString(),
				receivedByName: row.receivedByName ?? IMPORTED_RECEIVER_NAME,
				deletedAt: row.deletedAt?.toISOString() ?? null,
				deletedByName: row.deletedAt
					? (row.deletedByName ?? IMPORTED_RECEIVER_NAME)
					: null,
			},
		]),
	);
}

/**
 * Zwraca nieusunięte zwroty przyjęte danego dnia kalendarzowego w Polsce, od najnowszego.
 *
 * @param dateKey - Data `YYYY-MM-DD`.
 */
function findReturnsCreatedOn(dateKey: string): Promise<ReturnRecord[]> {
	return findReturnRecords(
		and(
			isNull(returns.deletedAt),
			sql`(${returns.createdAt} at time zone ${WARSAW_TIME_ZONE})::date = ${dateKey}::date`,
		),
	);
}

/**
 * Zwraca identyfikatory zwrotów przyjętych tuż przed i tuż po wskazanym (kolejność po `created_at`, remis po `id`),
 * z pominięciem usuniętych.
 *
 * @remarks Wskazany zwrot może być usunięty. Gdy go nie ma, oba identyfikatory to `null`.
 */
async function findReturnNeighbors(returnId: number): Promise<ReturnNeighbors> {
	const [current] = await db
		.select({ createdAt: returns.createdAt })
		.from(returns)
		.where(eq(returns.id, returnId));

	if (!current) {
		return { previousReturnId: null, nextReturnId: null };
	}

	const isActive = isNull(returns.deletedAt);
	const isSameMoment = eq(returns.createdAt, current.createdAt);
	const [previous] = await db
		.select({ id: returns.id })
		.from(returns)
		.where(
			and(
				isActive,
				or(
					lt(returns.createdAt, current.createdAt),
					and(isSameMoment, lt(returns.id, returnId)),
				),
			),
		)
		.orderBy(desc(returns.createdAt), desc(returns.id))
		.limit(1);
	const [next] = await db
		.select({ id: returns.id })
		.from(returns)
		.where(
			and(
				isActive,
				or(
					gt(returns.createdAt, current.createdAt),
					and(isSameMoment, gt(returns.id, returnId)),
				),
			),
		)
		.orderBy(asc(returns.createdAt), asc(returns.id))
		.limit(1);

	return {
		previousReturnId: previous?.id ?? null,
		nextReturnId: next?.id ?? null,
	};
}

async function findReturnEvents(returnId: number): Promise<ReturnEvent[]> {
	const rows = await db
		.select({
			id: returnEvents.id,
			kind: returnEvents.kind,
			createdAt: returnEvents.createdAt,
			userName: users.name,
			snapshot: returnEvents.snapshot,
		})
		.from(returnEvents)
		.leftJoin(users, eq(users.id, returnEvents.userId))
		.where(eq(returnEvents.returnId, returnId))
		.orderBy(asc(returnEvents.id));

	return rows.map((row) => ({
		...row,
		userName: row.userName ?? IMPORTED_RECEIVER_NAME,
		snapshot: returnSnapshotSchema.parse(row.snapshot),
	}));
}

async function findReturnRecords(
	condition: SQL | undefined,
): Promise<ReturnRecord[]> {
	const rows = await db
		.select(returnColumns)
		.from(returns)
		.leftJoin(users, eq(users.id, returns.receivedBy))
		.leftJoin(deleter, eq(deleter.id, returns.deletedBy))
		.leftJoin(indexedOrders, eq(indexedOrders.orderId, returns.orderId))
		.where(condition)
		.orderBy(desc(returns.createdAt));

	if (rows.length === 0) {
		return [];
	}

	const itemRows = await db
		.select(itemColumns)
		.from(returnItems)
		.where(
			inArray(
				returnItems.returnId,
				rows.map((row) => row.id),
			),
		)
		.orderBy(asc(returnItems.position), asc(returnItems.id));

	return rows.map((row) =>
		toReturnRecord(
			row,
			itemRows
				.filter((item) => item.returnId === row.id)
				.map(({ returnId: _returnId, ...item }) => item),
		),
	);
}

async function insertEvent(
	transaction: Transaction,
	{ returnId, kind, userId, createdAt }: NewEvent,
): Promise<void> {
	const [returnRow] = await transaction
		.select({ note: returns.note })
		.from(returns)
		.where(eq(returns.id, returnId));
	const items = await transaction
		.select(itemColumns)
		.from(returnItems)
		.where(eq(returnItems.returnId, returnId))
		.orderBy(asc(returnItems.position), asc(returnItems.id));
	const snapshot: ReturnSnapshot = {
		note: returnRow?.note ?? '',
		items: items.map(({ returnId: _returnId, ...item }) => item),
	};

	await transaction
		.insert(returnEvents)
		.values({ returnId, kind, userId, snapshot, createdAt });
}

function toReturnRecord(row: ReturnRow, items: ReturnItem[]): ReturnRecord {
	return {
		id: row.id,
		orderId: row.orderId,
		source: row.source,
		waproOrderNumber: row.waproOrderNumber ?? '',
		wmsCode: row.wmsCode ?? '',
		note: row.note,
		receivedBy: {
			id: row.receivedById,
			name: row.receivedByName ?? IMPORTED_RECEIVER_NAME,
		},
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletion: row.deletedAt
			? {
					at: row.deletedAt,
					byName: row.deletedByName ?? IMPORTED_RECEIVER_NAME,
				}
			: null,
		kind: getReturnKind(items),
		items,
	};
}

export {
	findExistingReturnsByOrderIds,
	findReturnById,
	findReturnByOrderId,
	findReturnEvents,
	findReturnNeighbors,
	findReturnsCreatedOn,
	insertReturnIfAbsent,
	restoreReturnWithEvent,
	softDeleteReturnWithEvent,
	updateReturnWithEvent,
};
