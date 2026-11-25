import 'server-only';
import type {
	IndexedOrderItem,
	IndexedPackage,
	OrderIndexEntry,
} from '@/features/returns/model/order-index.types';
import type {
	BaseLinkerOrder,
	BaseLinkerPackage,
} from '@/features/returns/server/sources/baselinker.schemas';
import {
	normalizeCode,
	normalizePhone,
	normalizePostcode,
	normalizeText,
	splitFullName,
} from '@/features/returns/utils/normalize-text';

const MILLISECONDS_PER_SECOND = 1000;

/**
 * Mapuje zamówienie z `getOrders` na wpis indeksu: zamówienie, pozycje i ostatnią przesyłkę
 * (`delivery_package_nr`; pozostałe przesyłki daje dopiero `getOrderPackages`).
 *
 * @remarks Imię i nazwisko z `delivery_fullname`, a gdy jest pusty, z `invoice_fullname`. Ulica i e-mail nie trafiają do indeksu.
 */
function mapBaseLinkerOrder(order: BaseLinkerOrder): OrderIndexEntry {
	const { firstName, lastName } = splitFullName(
		order.delivery_fullname,
		order.invoice_fullname,
	);

	return {
		order: {
			orderId: order.order_id,
			externalOrderId: order.external_order_id.trim(),
			source: order.order_source,
			sourceId: order.order_source_id,
			statusId: order.order_status_id,
			dateAdd: fromUnixSeconds(order.date_add),
			dateConfirmed:
				order.date_confirmed > 0 ? fromUnixSeconds(order.date_confirmed) : null,
			firstNameNormalized: firstName,
			lastNameNormalized: lastName,
			phoneDigits: normalizePhone(order.phone),
			postcode: normalizePostcode(order.delivery_postcode),
			cityNormalized: normalizeText(order.delivery_city),
		},
		items: order.products.map(mapProduct),
		packages: mapBaseLinkerPackages([
			{
				courier_package_nr: order.delivery_package_nr,
				courier_inner_number: '',
				courier_code: order.delivery_package_module,
			},
		]),
	};
}

/**
 * Normalizuje numery przesyłek. Pomija przesyłki bez numeru, przy braku numeru przewoźnika
 * używa numeru wewnętrznego, a powtórzony numer zostawia raz (uzupełniając brakujące pola).
 */
function mapBaseLinkerPackages(
	packages: BaseLinkerPackage[],
): IndexedPackage[] {
	const packageByNumber = new Map<string, IndexedPackage>();

	for (const baseLinkerPackage of packages) {
		const mapped = mapPackage(baseLinkerPackage);

		if (!mapped.packageNumber) {
			continue;
		}

		const known = packageByNumber.get(mapped.packageNumber);
		packageByNumber.set(mapped.packageNumber, {
			packageNumber: mapped.packageNumber,
			innerNumber: mapped.innerNumber || known?.innerNumber || '',
			courierCode: mapped.courierCode || known?.courierCode || '',
		});
	}

	return [...packageByNumber.values()];
}

function mapPackage(baseLinkerPackage: BaseLinkerPackage): IndexedPackage {
	const innerNumber = normalizeCode(baseLinkerPackage.courier_inner_number);

	return {
		packageNumber:
			normalizeCode(baseLinkerPackage.courier_package_nr) || innerNumber,
		innerNumber,
		courierCode: baseLinkerPackage.courier_code.trim(),
	};
}

function mapProduct(
	product: BaseLinkerOrder['products'][number],
	position: number,
): IndexedOrderItem {
	return {
		position,
		orderProductId: product.order_product_id ?? null,
		productId: product.product_id,
		name: product.name.trim(),
		ean: product.ean.trim(),
		sku: product.sku.trim(),
		quantity: Math.max(0, Math.round(product.quantity)),
	};
}

function fromUnixSeconds(seconds: number): Date {
	return new Date(seconds * MILLISECONDS_PER_SECOND);
}

export { mapBaseLinkerOrder, mapBaseLinkerPackages };
