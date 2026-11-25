import type {
	ReturnedQuantities,
	ReturnKind,
} from '@/features/returns/model/returns.types';

/**
 * Zwraca `full`, gdy każda pozycja ma przyjęte co najmniej tyle sztuk, ile zamówiono, inaczej `partial`.
 * Zwrot bez pozycji jest częściowy.
 */
export function getReturnKind(items: ReturnedQuantities[]): ReturnKind {
	const isFull =
		items.length > 0 &&
		items.every((item) => item.quantityReceived >= item.quantityOrdered);

	return isFull ? 'full' : 'partial';
}
