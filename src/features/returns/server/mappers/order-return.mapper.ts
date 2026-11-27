import 'server-only';
import type { OrderReturnRecord } from '@/features/returns/model/order-returns.types';
import type { BaseLinkerOrderReturn } from '@/features/returns/server/sources/baselinker.schemas';
import {
	normalizeCode,
	normalizePostcode,
} from '@/features/returns/utils/normalize-text';

const MILLISECONDS_PER_SECOND = 1000;
const MAX_FULL_NAME_LENGTH = 200;

/**
 * Mapuje zwrot z `getOrderReturns` na rekord indeksu. Numer paczki jest normalizowany (`''`, gdy go brak),
 * a produkty zachowują tylko nazwę, EAN, SKU i ilość.
 */
function mapBaseLinkerOrderReturn(
	orderReturn: BaseLinkerOrderReturn,
): OrderReturnRecord {
	return {
		returnId: orderReturn.return_id,
		orderId: orderReturn.order_id,
		referenceNumber: orderReturn.reference_number.trim(),
		packageNumber: normalizeCode(orderReturn.delivery_package_nr),
		packageModule: orderReturn.delivery_package_module.trim(),
		source: orderReturn.order_return_source.trim(),
		statusId: orderReturn.status_id,
		fullName: orderReturn.delivery_fullname
			.trim()
			.slice(0, MAX_FULL_NAME_LENGTH),
		postcode: normalizePostcode(orderReturn.delivery_postcode),
		products: orderReturn.products.map((product) => ({
			name: product.name.trim(),
			ean: product.ean.trim(),
			sku: product.sku.trim(),
			quantity: Math.max(0, Math.round(product.quantity)),
		})),
		dateAdd: new Date(orderReturn.date_add * MILLISECONDS_PER_SECOND),
	};
}

export { mapBaseLinkerOrderReturn };
