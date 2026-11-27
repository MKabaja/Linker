import 'server-only';
import type { PendingOrderReturn } from '@/features/returns/model/order-returns.types';
import type { PendingReturnView } from '@/features/returns/model/typed-number.types';

const POSTCODE_DIGITS = 5;
const POSTCODE_DASH_INDEX = 2;

/**
 * Mapuje zwrot z modułu zwrotów BaseLinkera na widok listy oczekujących:
 * data jako ISO, kod pocztowy z kreską (`32432` na `32-432`), produkty tylko z nazwą i ilością.
 */
function toPendingReturnView(
	pendingReturn: PendingOrderReturn,
): PendingReturnView {
	return {
		returnId: pendingReturn.returnId,
		orderId: pendingReturn.orderId,
		referenceNumber: pendingReturn.referenceNumber,
		packageNumber: pendingReturn.packageNumber,
		customerName: pendingReturn.fullName,
		postcode: formatPostcode(pendingReturn.postcode),
		addedAt: pendingReturn.dateAdd.toISOString(),
		products: pendingReturn.products.map(({ name, quantity }) => ({
			name,
			quantity,
		})),
	};
}

function formatPostcode(digits: string): string {
	return digits.length === POSTCODE_DIGITS
		? `${digits.slice(0, POSTCODE_DASH_INDEX)}-${digits.slice(POSTCODE_DASH_INDEX)}`
		: digits;
}

export { toPendingReturnView };
