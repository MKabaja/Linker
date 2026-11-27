import 'server-only';
import {
	and,
	asc,
	desc,
	eq,
	inArray,
	isNotNull,
	isNull,
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
	ReturnCorrection,
	ReturnEvent,
	ReturnEventKind,
	ReturnItem,
	ReturnMatchedBy,
	ReturnNeighbors,
	ReturnRecord,
	ReturnSnapshot,
	SetReturnCorrectionResult,
} from '@/features/returns/model/returns.types';
import type {
	ReturnsCorrectionFilter,
	ReturnsListScope,
	ReturnsSort,
} from '@/features/returns/model/returns-list.types';
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

type CorrectionChange = {
	returnId: number;
	userId: number;
	issuedAt: Date;
	isIssued: boolean;
};

type UpdateOutcome = 'updated' | 'deleted' | 'notFound';

type OrderBySort = Record<ReturnsSort, SQL[]>;

type ConditionByCorrectionFilter = Record<
	ReturnsCorrectionFilter,
	SQL | undefined
>;

type ExistingReturnByOrderId = Map<number, ExistingReturn>;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const deleter = alias(users, 'deleter');
const corrector = alias(users, 'corrector');

const orderBySort: OrderBySort = {
	'scanned-desc': [desc(returns.createdAt), desc(returns.id)],
	'scanned-asc': [asc(returns.createdAt), asc(returns.id)],
	'order-asc': [asc(returns.orderId), asc(returns.id)],
	'order-desc': [desc(returns.orderId), desc(returns.id)],
};

const conditionByCorrectionFilter: ConditionByCorrectionFilter = {
	all: undefined,
	without: isNull(returns.correctionIssuedAt),
	with: isNotNull(returns.correctionIssuedAt),
};

const returnColumns = {
	id: returns.id,
	orderId: returns.orderId,
	source: returns.orderSource,
	waproOrderNumber: indexedOrders.waproOrderNumber,
	wmsCode: indexedOrders.wmsCode,
	note: returns.note,
	matchedBy: returns.matchedBy,
	scannedLabel: returns.scannedLabel,
	createdAt: returns.createdAt,
	updatedAt: returns.updatedAt,
	deletedAt: returns.deletedAt,
	deletedByName: deleter.name,
	correctionIssuedAt: returns.correctionIssuedAt,
	correctionIssuedByName: corrector.name,
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
	matchedBy: ReturnMatchedBy;
	scannedLabel: string | null;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
	deletedByName: string | null;
	correctionIssuedAt: Date | null;
	correctionIssuedByName: string | null;
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

/**
 * Ustawia albo zdejmuje znacznik wystawienia korekty. Zapis jest idempotentny: powtórne ustawienie nie zmienia osoby ani czasu.
 *
 * @remarks Wiersz zwrotu jest blokowany do końca transakcji. Usunięty zwrot nie zmienia się (`deleted`).
 */
async function setReturnCorrection({
	returnId,
	userId,
	issuedAt,
	isIssued,
}: CorrectionChange): Promise<SetReturnCorrectionResult> {
	return db.transaction(async (transaction) => {
		const [locked] = await transaction
			.select({
				deletedAt: returns.deletedAt,
				correctionIssuedAt: returns.correctionIssuedAt,
			})
			.from(returns)
			.where(eq(returns.id, returnId))
			.for('update');

		if (!locked) {
			return { status: 'notFound' };
		}

		if (locked.deletedAt) {
			return { status: 'deleted' };
		}

		if (isIssued !== (locked.correctionIssuedAt !== null)) {
			await transaction
				.update(returns)
				.set(
					isIssued
						? { correctionIssuedAt: issuedAt, correctionIssuedBy: userId }
						: { correctionIssuedAt: null, correctionIssuedBy: null },
				)
				.where(eq(returns.id, returnId));
		}

		const [current] = await transaction
			.select({
				at: returns.correctionIssuedAt,
				byName: corrector.name,
			})
			.from(returns)
			.leftJoin(corrector, eq(corrector.id, returns.correctionIssuedBy))
			.where(eq(returns.id, returnId));

		return {
			status: 'updated',
			correction: toReturnCorrection(
				current?.at ?? null,
				current?.byName ?? null,
			),
		};
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
 * Zwraca identyfikatory zamówień, które mają aktywny (nieusunięty) przyjęty zwrot.
 */
async function findActiveReturnOrderIds(): Promise<Set<number>> {
	const rows = await db
		.select({ orderId: returns.orderId })
		.from(returns)
		.where(isNull(returns.deletedAt));

	return new Set(rows.map((row) => row.orderId));
}

/**
 * Zwraca nieusunięte zwroty z zakresu listy (dzień kalendarzowy w Polsce, filtr korekty) w wybranej kolejności.
 */
function findReturnsInScope(scope: ReturnsListScope): Promise<ReturnRecord[]> {
	return findReturnRecords(buildListCondition(scope), orderBySort[scope.sort]);
}

/**
 * Zwraca identyfikatory zwrotów tuż przed i tuż po wskazanym na liście o podanym zakresie
 * (te same warunki i kolejność co {@link findReturnsInScope}), remis rozstrzyga `id`.
 *
 * @remarks Wskazany zwrot zawsze jest w ciągu, także gdy jest usunięty albo nie pasuje już do filtra.
 * Gdy go nie ma w bazie, oba identyfikatory to `null`.
 */
async function findReturnNeighbors(
	returnId: number,
	scope: ReturnsListScope,
): Promise<ReturnNeighbors> {
	const orderClause = sql.join(orderBySort[scope.sort], sql`, `);
	const sequence = db
		.select({
			id: returns.id,
			previousReturnId: sql<
				number | null
			>`lag(${returns.id}) over (order by ${orderClause})`.as(
				'previous_return_id',
			),
			nextReturnId: sql<
				number | null
			>`lead(${returns.id}) over (order by ${orderClause})`.as(
				'next_return_id',
			),
		})
		.from(returns)
		.where(or(buildListCondition(scope), eq(returns.id, returnId)))
		.as('return_sequence');
	const [neighbors] = await db
		.select({
			previousReturnId: sequence.previousReturnId,
			nextReturnId: sequence.nextReturnId,
		})
		.from(sequence)
		.where(eq(sequence.id, returnId));

	return neighbors ?? { previousReturnId: null, nextReturnId: null };
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

function buildListCondition({ date, correction }: ReturnsListScope): SQL {
	const isOnDate = date
		? sql`(${returns.createdAt} at time zone ${WARSAW_TIME_ZONE})::date = ${date}::date`
		: undefined;

	return (
		and(
			isNull(returns.deletedAt),
			isOnDate,
			conditionByCorrectionFilter[correction],
		) ?? sql`true`
	);
}

async function findReturnRecords(
	condition: SQL | undefined,
	orderBy: SQL[] = orderBySort['scanned-desc'],
): Promise<ReturnRecord[]> {
	const rows = await db
		.select(returnColumns)
		.from(returns)
		.leftJoin(users, eq(users.id, returns.receivedBy))
		.leftJoin(deleter, eq(deleter.id, returns.deletedBy))
		.leftJoin(corrector, eq(corrector.id, returns.correctionIssuedBy))
		.leftJoin(indexedOrders, eq(indexedOrders.orderId, returns.orderId))
		.where(condition)
		.orderBy(...orderBy);

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

function toReturnCorrection(
	issuedAt: Date | null,
	byName: string | null,
): ReturnCorrection | null {
	return issuedAt ? { at: issuedAt, byName } : null;
}

function toReturnRecord(row: ReturnRow, items: ReturnItem[]): ReturnRecord {
	return {
		id: row.id,
		orderId: row.orderId,
		source: row.source,
		waproOrderNumber: row.waproOrderNumber ?? '',
		wmsCode: row.wmsCode ?? '',
		note: row.note,
		matchedBy: row.matchedBy,
		scannedLabel: row.scannedLabel,
		correction: toReturnCorrection(
			row.correctionIssuedAt,
			row.correctionIssuedByName,
		),
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
	findActiveReturnOrderIds,
	findExistingReturnsByOrderIds,
	findReturnById,
	findReturnByOrderId,
	findReturnEvents,
	findReturnNeighbors,
	findReturnsInScope,
	insertReturnIfAbsent,
	restoreReturnWithEvent,
	setReturnCorrection,
	softDeleteReturnWithEvent,
	updateReturnWithEvent,
};
