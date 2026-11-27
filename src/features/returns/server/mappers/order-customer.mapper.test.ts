import { describe, expect, it } from 'vitest';
import { mapBaseLinkerOrderCustomer } from '@/features/returns/server/mappers/order-customer.mapper';
import type { BaseLinkerOrderCustomer } from '@/features/returns/server/sources/baselinker.schemas';

function buildCustomer(
	overrides: Partial<BaseLinkerOrderCustomer> = {},
): BaseLinkerOrderCustomer {
	return {
		user_login: 'jan_k',
		phone: ' +48 600 100 200 ',
		email: 'jan@example.com',
		delivery_method: 'Kurier DHL',
		delivery_fullname: 'Jan Kowalski',
		delivery_company: '',
		delivery_address: 'Długa 5/2',
		delivery_city: 'Kraków',
		delivery_postcode: '30-001',
		delivery_country_code: 'PL',
		delivery_point_name: '',
		delivery_point_address: '',
		delivery_point_city: '',
		delivery_point_postcode: '',
		payment_method: 'Przelewy24',
		...overrides,
	};
}

describe('mapBaseLinkerOrderCustomer', () => {
	it('składa adres dostawy bez kraju dla Polski', () => {
		const customer = mapBaseLinkerOrderCustomer(buildCustomer());

		expect(customer).toEqual({
			name: 'Jan Kowalski',
			login: 'jan_k',
			phone: '+48 600 100 200',
			email: 'jan@example.com',
			deliveryAddress: 'Długa 5/2, 30-001 Kraków',
			deliveryMethod: 'Kurier DHL',
			paymentMethod: 'Przelewy24',
		});
	});

	it('dopisuje kraj spoza Polski', () => {
		const { deliveryAddress } = mapBaseLinkerOrderCustomer(
			buildCustomer({ delivery_country_code: 'sk' }),
		);

		expect(deliveryAddress).toBe('Długa 5/2, 30-001 Kraków, SK');
	});

	it('punkt odbioru wypiera adres dostawy', () => {
		const { deliveryAddress } = mapBaseLinkerOrderCustomer(
			buildCustomer({
				delivery_point_name: 'KRK12M',
				delivery_point_address: 'Floriańska 1',
				delivery_point_postcode: '31-019',
				delivery_point_city: 'Kraków',
			}),
		);

		expect(deliveryAddress).toBe(
			'Punkt odbioru: KRK12M, Floriańska 1, 31-019 Kraków',
		);
	});

	it('bez odbiorcy podaje firmę', () => {
		const { name } = mapBaseLinkerOrderCustomer(
			buildCustomer({ delivery_fullname: ' ', delivery_company: 'ACME' }),
		);

		expect(name).toBe('ACME');
	});
});
