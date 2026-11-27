import 'server-only';
import type { NewReturnItem } from '@/features/returns/model/new-return.types';
import type { ScannerMatchedBy } from '@/features/returns/model/return-origin.constants';
import type { UpdateReturn } from '@/features/returns/model/returns.schemas';
import type {
	CreateReturnResult,
	CsvFile,
	DayReturns,
	DeleteReturnResult,
	OrderDetails,
	RestoreReturnResult,
	ReturnDetails,
	ReturnNeighbors,
	ReturnRecord,
	UpdateReturnResult,
} from '@/features/returns/model/returns.types';
import { toDuplicateReturnWarning } from '@/features/returns/server/mappers/duplicate-return.mapper';
import {
	findReturnById,
	findReturnByOrderId,
	findReturnEvents,
	findReturnNeighbors,
	findReturnsCreatedOn,
	insertReturnIfAbsent,
	restoreReturnWithEvent,
	softDeleteReturnWithEvent,
	updateReturnWithEvent,
} from '@/features/returns/server/repositories/returns.repository';
import { buildReturnsCsv } from '@/features/returns/utils/returns-csv';
import { getOrderDetails } from './order-details.service';

type NewReturnRequest = {
	orderId: number;
	userId: number;
	matchedBy: ScannerMatchedBy;
	scannedLabel: string | null;
	now: Date;
};

type ReturnUpdateRequest = { update: UpdateReturn; userId: number; now: Date };

type ReturnStateChangeRequest = { returnId: number; userId: number; now: Date };

/**
 * Tworzy zwrot z pozycji zamówienia, domyślnie z przyjętymi wszystkimi zamówionymi sztukami.
 *
 * @remarks
 * Gdy zwrot dla zamówienia już istnieje (także z importu albo usunięty), zwraca `duplicate` z istniejącym zwrotem
 * i danymi do ostrzeżenia, bez drugiego wpisu; równoległe wywołania rozstrzyga ograniczenie unikalne na `order_id`.
 */
async function createReturn({
	orderId,
	userId,
	matchedBy,
	scannedLabel,
	now,
}: NewReturnRequest): Promise<CreateReturnResult> {
	const existing = await findReturnByOrderId(orderId);

	if (existing) {
		return toDuplicateResult(existing);
	}

	const details = await getOrderDetails(orderId, now);

	if (details.status !== 'found') {
		return details;
	}

	const returnId = await insertReturnIfAbsent({
		orderId,
		source: details.order.source,
		note: '',
		receivedBy: userId,
		matchedBy,
		scannedLabel,
		items: toReturnItems(details.order),
		createdAt: now,
		updatedAt: now,
	});
	const returnRecord = await findReturnByOrderId(orderId);

	if (!returnRecord) {
		return { status: 'error', message: 'Nie udało się zapisać zwrotu.' };
	}

	return returnId === null
		? toDuplicateResult(returnRecord)
		: { status: 'created', returnRecord };
}

/**
 * Zmienia notatkę i przyjęte sztuki; każda zmiana dopisuje wpis do historii.
 *
 * @remarks Usuniętego zwrotu nie da się edytować: wynik `deleted`, bez zmian.
 */
async function updateReturn({
	update,
	userId,
	now,
}: ReturnUpdateRequest): Promise<UpdateReturnResult> {
	const outcome = await updateReturnWithEvent({
		update,
		userId,
		updatedAt: now,
	});

	if (outcome !== 'updated') {
		return { status: outcome };
	}

	const returnRecord = await findReturnById(update.returnId);

	return returnRecord
		? { status: 'updated', returnRecord }
		: { status: 'notFound' };
}

/**
 * Usuwa zwrot miękko: zostaje w bazie z osobą i datą usunięcia oraz wpisem `deleted` w historii.
 * Zamówienie nadal ma zwrot, więc ponowne przyjęcie kończy się `duplicate`.
 */
async function deleteReturn({
	returnId,
	userId,
	now,
}: ReturnStateChangeRequest): Promise<DeleteReturnResult> {
	const isDeleted = await softDeleteReturnWithEvent({
		returnId,
		userId,
		deletedAt: now,
	});
	return isDeleted ? { status: 'deleted' } : { status: 'notFound' };
}

/**
 * Przywraca usunięty zwrot i dopisuje wpis `restored`; `notFound`, gdy zwrotu nie ma albo nie jest usunięty.
 */
async function restoreReturn({
	returnId,
	userId,
	now,
}: ReturnStateChangeRequest): Promise<RestoreReturnResult> {
	const isRestored = await restoreReturnWithEvent({
		returnId,
		userId,
		restoredAt: now,
	});
	return isRestored ? { status: 'restored' } : { status: 'notFound' };
}

/**
 * Zwraca zwrot z historią, także usunięty (wtedy `deletion` mówi kto i kiedy).
 */
async function getReturn(returnId: number): Promise<ReturnDetails | null> {
	const returnRecord = await findReturnById(returnId);

	if (!returnRecord) {
		return null;
	}

	return { ...returnRecord, events: await findReturnEvents(returnId) };
}

/**
 * Zwraca sąsiednie zwroty w kolejności przyjęcia, z pominięciem usuniętych; `null` oznacza koniec listy.
 */
function getReturnNeighbors(returnId: number): Promise<ReturnNeighbors> {
	return findReturnNeighbors(returnId);
}

function getReturnRecord(returnId: number): Promise<ReturnRecord | null> {
	return findReturnById(returnId);
}

function getReturnByOrderId(orderId: number): Promise<ReturnRecord | null> {
	return findReturnByOrderId(orderId);
}

/**
 * Zwraca zwroty przyjęte danego dnia (strefa Europe/Warsaw) z liczbą pełnych i częściowych.
 *
 * @param date - Data `YYYY-MM-DD`.
 */
async function getReturnsOfDay(date: string): Promise<DayReturns> {
	const dayReturns = await findReturnsCreatedOn(date);
	const full = dayReturns.filter(({ kind }) => kind === 'full').length;

	return {
		date,
		returns: dayReturns,
		summary: {
			total: dayReturns.length,
			full,
			partial: dayReturns.length - full,
		},
	};
}

async function exportReturnsOfDay(date: string): Promise<CsvFile> {
	const { returns } = await getReturnsOfDay(date);

	return { fileName: `zwroty-${date}.csv`, content: buildReturnsCsv(returns) };
}

function toDuplicateResult(returnRecord: ReturnRecord): CreateReturnResult {
	return {
		status: 'duplicate',
		returnRecord,
		existingReturn: toDuplicateReturnWarning(returnRecord),
	};
}

function toReturnItems(order: OrderDetails): NewReturnItem[] {
	return order.items.map((item) => ({
		position: item.position,
		orderProductId: item.orderProductId,
		name: item.name,
		ean: item.ean,
		sku: item.sku,
		quantityOrdered: item.quantity,
		quantityReceived: item.quantity,
		condition: 'accepted',
	}));
}

export {
	createReturn,
	deleteReturn,
	exportReturnsOfDay,
	getReturn,
	getReturnByOrderId,
	getReturnNeighbors,
	getReturnRecord,
	getReturnsOfDay,
	restoreReturn,
	updateReturn,
};
