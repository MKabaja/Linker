import type { ReturnItemQuantity } from '@/features/returns/model/event-log.types';
import type { ReturnItem } from '@/features/returns/model/returns.types';

/**
 * Skraca pozycje zwrotu do tego, co zmienia się przy edycji: przyjęte sztuki i stan.
 */
function toReturnItemQuantities(items: ReturnItem[]): ReturnItemQuantity[] {
	return items.map(({ id, quantityReceived, condition }) => ({
		itemId: id,
		quantityReceived,
		condition,
	}));
}

export { toReturnItemQuantities };
