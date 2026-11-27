import 'server-only';
import type { OrderCustomer } from '@/features/returns/model/order-live.types';
import type { BaseLinkerOrderCustomer } from '@/features/returns/server/sources/baselinker.schemas';

const DEFAULT_COUNTRY_CODE = 'PL';

/**
 * Mapuje zamówienie z `getOrders` na dane klienta do wyświetlenia.
 *
 * @remarks Nazwa to odbiorca, a gdy go brak, firma. Punkt odbioru (paczkomat, punkt) wypiera adres dostawy.
 */
function mapBaseLinkerOrderCustomer(
	order: BaseLinkerOrderCustomer,
): OrderCustomer {
	return {
		name: firstFilled(order.delivery_fullname, order.delivery_company),
		login: order.user_login.trim(),
		phone: order.phone.trim(),
		email: order.email.trim(),
		deliveryAddress: formatDeliveryAddress(order),
		deliveryMethod: order.delivery_method.trim(),
		paymentMethod: order.payment_method.trim(),
	};
}

function formatDeliveryAddress(order: BaseLinkerOrderCustomer): string {
	const pickupPoint = joinFilled([
		order.delivery_point_name,
		order.delivery_point_address,
		joinFilled([order.delivery_point_postcode, order.delivery_point_city], ' '),
	]);

	if (pickupPoint) {
		return `Punkt odbioru: ${pickupPoint}`;
	}

	const countryCode = order.delivery_country_code.trim().toUpperCase();

	return joinFilled([
		order.delivery_address,
		joinFilled([order.delivery_postcode, order.delivery_city], ' '),
		countryCode === DEFAULT_COUNTRY_CODE ? '' : countryCode,
	]);
}

function firstFilled(...values: string[]): string {
	return values.map((value) => value.trim()).find(Boolean) ?? '';
}

function joinFilled(parts: string[], separator = ', '): string {
	return parts
		.map((part) => part.trim())
		.filter(Boolean)
		.join(separator);
}

export { mapBaseLinkerOrderCustomer };
