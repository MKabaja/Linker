import 'server-only';
import type { IndexedOrder } from '@/features/returns/model/order-scoring.types';
import type { TypedNumberRequest } from '@/features/returns/model/typed-number.schemas';
import type { TypedNumberCandidate } from '@/features/returns/model/typed-number.types';
import { toTypedNumberCandidate } from '@/features/returns/server/mappers/typed-number-candidate.mapper';
import { getIndexedOrders } from '@/features/returns/server/repositories/indexed-orders.cache';
import { findOrderIdsByReturnReference } from '@/features/returns/server/repositories/order-returns.repository';
import {
	findActiveReturnOrderIds,
	findExistingReturnsByOrderIds,
} from '@/features/returns/server/repositories/returns.repository';
import { findOrdersByPackageSuffix } from '@/features/returns/utils/package-suffix-search';

type TypedNumberSearch = TypedNumberRequest & { now: Date };

/**
 * Szuka zamówień po wpisanej końcówce numeru paczki (min. 4 znaki) albo po kodzie zwrotu Allegro.
 *
 * @remarks
 * Pomija zamówienia z aktywnym przyjętym zwrotem, a przy kodzie zwrotu pokazuje je z oznaczeniem.
 * Gdy przewoźnik z bieżącego skanu nic nie daje, szuka jeszcze raz bez niego.
 * Zamówienia spoza indeksu nie trafiają na listę.
 */
async function searchTypedNumber({
	text,
	carrier,
	traces = [],
	now,
}: TypedNumberSearch): Promise<TypedNumberCandidate[]> {
	const [orders, excludedOrderIds] = await Promise.all([
		getIndexedOrders(now),
		findActiveReturnOrderIds(),
	]);
	const suffixQuery = { suffix: text, orders, excludedOrderIds, traces };
	let result = findOrdersByPackageSuffix({ ...suffixQuery, carrier });

	if (result.status === 'orders' && result.matches.length === 0 && carrier) {
		result = findOrdersByPackageSuffix(suffixQuery);
	}

	if (result.status === 'too-short') {
		return [];
	}

	if (result.status === 'return-reference') {
		return findCandidateByReturnReference(result.reference, orders);
	}

	const existingReturnByOrderId = await findExistingReturnsByOrderIds(
		result.matches.map(({ order }) => order.orderId),
	);

	return result.matches.map(({ order, packageNumber }) =>
		toTypedNumberCandidate({
			order,
			packageNumber,
			returnReference: null,
			existingReturn: existingReturnByOrderId.get(order.orderId) ?? null,
		}),
	);
}

async function findCandidateByReturnReference(
	reference: string,
	orders: IndexedOrder[],
): Promise<TypedNumberCandidate[]> {
	const orderIdByReference = await findOrderIdsByReturnReference([reference]);
	const orderId = orderIdByReference.get(reference);
	const order = orders.find((candidate) => candidate.orderId === orderId);

	if (!order) {
		return [];
	}

	const existingReturnByOrderId = await findExistingReturnsByOrderIds([
		order.orderId,
	]);

	return [
		toTypedNumberCandidate({
			order,
			packageNumber: null,
			returnReference: reference,
			existingReturn: existingReturnByOrderId.get(order.orderId) ?? null,
		}),
	];
}

export { searchTypedNumber };
