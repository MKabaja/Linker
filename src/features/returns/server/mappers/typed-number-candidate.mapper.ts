import 'server-only';
import type { IndexedOrder } from '@/features/returns/model/order-scoring.types';
import type { ExistingReturn } from '@/features/returns/model/order-search.types';
import type { TypedNumberCandidate } from '@/features/returns/model/typed-number.types';

const MILLISECONDS_PER_SECOND = 1000;

type CandidateSource = {
	order: IndexedOrder;
	packageNumber: string | null;
	returnReference: string | null;
	existingReturn: ExistingReturn | null;
};

/**
 * Mapuje zamówienie z indeksu na kandydata z listy po wpisanej końcówce numeru.
 * Data to potwierdzenie zamówienia, a gdy go brak, dodanie.
 */
function toTypedNumberCandidate({
	order,
	packageNumber,
	returnReference,
	existingReturn,
}: CandidateSource): TypedNumberCandidate {
	const orderSeconds = order.dateConfirmed || order.dateAdd;
	return {
		orderId: order.orderId,
		packageNumber,
		returnReference,
		customerName: capitalizeWords(
			`${order.firstNameNorm} ${order.lastNameNorm}`,
		),
		orderedAt: new Date(orderSeconds * MILLISECONDS_PER_SECOND).toISOString(),
		existingReturn,
	};
}

function capitalizeWords(text: string): string {
	return text
		.split(' ')
		.filter(Boolean)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');
}

export { toTypedNumberCandidate };
