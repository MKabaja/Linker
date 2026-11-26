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
	ReturnDetails,
	ReturnRecord,
	UpdateReturnResult,
} from '@/features/returns/model/returns.types';
import { toDuplicateReturnWarning } from '@/features/returns/server/mappers/duplicate-return.mapper';
import {
	deleteReturnById,
	findReturnById,
	findReturnByOrderId,
	findReturnEvents,
	findReturnsCreatedOn,
	insertReturnIfAbsent,
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

/**
 * Tworzy zwrot z pozycji zamówienia, domyślnie z przyjętymi wszystkimi zamówionymi sztukami.
 *
 * @remarks
 * Gdy zwrot dla zamówienia już istnieje (także z importu), zwraca `duplicate` z istniejącym zwrotem
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
 */
async function updateReturn({
	update,
	userId,
	now,
}: ReturnUpdateRequest): Promise<UpdateReturnResult> {
	const isUpdated = await updateReturnWithEvent({
		update,
		userId,
		updatedAt: now,
	});
	const returnRecord = isUpdated ? await findReturnById(update.returnId) : null;

	return returnRecord
		? { status: 'updated', returnRecord }
		: { status: 'notFound' };
}

async function deleteReturn(returnId: number): Promise<DeleteReturnResult> {
	const isDeleted = await deleteReturnById(returnId);
	return isDeleted ? { status: 'deleted' } : { status: 'notFound' };
}

async function getReturn(returnId: number): Promise<ReturnDetails | null> {
	const returnRecord = await findReturnById(returnId);

	if (!returnRecord) {
		return null;
	}

	return { ...returnRecord, events: await findReturnEvents(returnId) };
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
	getReturnsOfDay,
	updateReturn,
};
