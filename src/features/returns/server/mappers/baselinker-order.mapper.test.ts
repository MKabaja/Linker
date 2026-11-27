import { describe, expect, it } from 'vitest';
import {
	mapBaseLinkerOrder,
	mapBaseLinkerPackages,
} from '@/features/returns/server/mappers/baselinker-order.mapper';
import type { BaseLinkerOrder } from '@/features/returns/server/sources/baselinker.schemas';

function buildOrder(overrides: Partial<BaseLinkerOrder> = {}): BaseLinkerOrder {
	return {
		order_id: 353637496,
		external_order_id: ' 261105x21790 ',
		order_source: 'erli',
		order_source_id: 12,
		order_status_id: 327896,
		date_add: 1_763_000_000,
		date_confirmed: 1_763_000_600,
		phone: '+48 732 012 383',
		delivery_fullname: 'Łucja Maria Żółkiewska-Nowak',
		invoice_fullname: 'Firma Testowa',
		delivery_postcode: '32-432',
		delivery_city: 'Łódź',
		delivery_package_module: 'dhl',
		delivery_package_nr: ' 317 345 065 09 ',
		extra_field_1: ' ZO 49006/26/K ',
		custom_extra_fields: { '77709': ' 5900001601709 ' },
		products: [
			{
				order_product_id: 101,
				product_id: '55',
				name: ' Krem ',
				ean: '5900000000001',
				sku: 'KR-1',
				quantity: 2,
			},
		],
		...overrides,
	};
}

describe('mapBaseLinkerOrder', () => {
	it('zapisuje tylko znormalizowane dane osobowe', () => {
		const { order } = mapBaseLinkerOrder(buildOrder());

		expect(order).toEqual({
			orderId: 353637496,
			externalOrderId: '261105x21790',
			source: 'erli',
			sourceId: 12,
			statusId: 327896,
			dateAdd: new Date(1_763_000_000_000),
			dateConfirmed: new Date(1_763_000_600_000),
			firstNameNormalized: 'lucja',
			lastNameNormalized: 'nowak',
			phoneDigits: '732012383',
			postcode: '32432',
			cityNormalized: 'lodz',
			waproOrderNumber: 'ZO 49006/26/K',
			wmsCode: '5900001601709',
		});
	});

	it('bierze imię i nazwisko z faktury, gdy dostawa jest pusta', () => {
		const { order } = mapBaseLinkerOrder(
			buildOrder({ delivery_fullname: '  ', invoice_fullname: 'Jan Kowalski' }),
		);

		expect(order.firstNameNormalized).toBe('jan');
		expect(order.lastNameNormalized).toBe('kowalski');
	});

	it('brak pól dodatkowych daje puste numery WAPRO i WMS', () => {
		const { order } = mapBaseLinkerOrder(
			buildOrder({ extra_field_1: '', custom_extra_fields: {} }),
		);

		expect(order.waproOrderNumber).toBe('');
		expect(order.wmsCode).toBe('');
	});

	it('niepotwierdzone zamówienie nie ma daty potwierdzenia', () => {
		const { order } = mapBaseLinkerOrder(buildOrder({ date_confirmed: 0 }));

		expect(order.dateConfirmed).toBeNull();
	});

	it('ostatnia przesyłka z getOrders trafia do paczek po normalizacji', () => {
		const { packages } = mapBaseLinkerOrder(buildOrder());

		expect(packages).toEqual([
			{
				packageNumber: '31734506509',
				innerNumber: '',
				courierCode: 'dhl',
				isReturn: false,
			},
		]);
	});

	it('zamówienie bez numeru przesyłki nie ma paczek', () => {
		const { packages } = mapBaseLinkerOrder(
			buildOrder({ delivery_package_nr: '' }),
		);

		expect(packages).toEqual([]);
	});

	it('pozycje mają kolejne pozycje i całkowite ilości', () => {
		const { items } = mapBaseLinkerOrder(
			buildOrder({
				products: [
					{
						product_id: '1',
						name: 'A',
						ean: '',
						sku: '',
						quantity: 1.6,
					},
					{
						order_product_id: 7,
						product_id: '2',
						name: 'B',
						ean: '1',
						sku: '',
						quantity: -1,
					},
				],
			}),
		);

		expect(
			items.map(({ position, orderProductId, quantity }) => ({
				position,
				orderProductId,
				quantity,
			})),
		).toEqual([
			{ position: 0, orderProductId: null, quantity: 2 },
			{ position: 1, orderProductId: 7, quantity: 0 },
		]);
	});
});

describe('mapBaseLinkerPackages', () => {
	it('scala powtórzony numer i używa numeru wewnętrznego, gdy brak numeru przewoźnika', () => {
		const packages = mapBaseLinkerPackages([
			{
				courier_package_nr: 'jjd 0001',
				courier_inner_number: '',
				courier_code: '',
				package_type: '',
			},
			{
				courier_package_nr: 'JJD0001',
				courier_inner_number: 'a-12',
				courier_code: 'dhl',
				package_type: '',
			},
			{
				courier_package_nr: '',
				courier_inner_number: 'x 9',
				courier_code: 'dpd',
				package_type: '',
			},
			{
				courier_package_nr: ' ',
				courier_inner_number: '',
				courier_code: 'dpd',
				package_type: '',
			},
		]);

		expect(packages).toEqual([
			{
				packageNumber: 'JJD0001',
				innerNumber: 'A12',
				courierCode: 'dhl',
				isReturn: false,
			},
			{
				packageNumber: 'X9',
				innerNumber: 'X9',
				courierCode: 'dpd',
				isReturn: false,
			},
		]);
	});

	it('rozpoznaje przesyłkę zwrotną po typie paczki i numerze wewnętrznym return_', () => {
		const packages = mapBaseLinkerPackages([
			{
				courier_package_nr: '31863808287',
				courier_inner_number: '',
				courier_code: 'dhl',
				package_type: '0',
			},
			{
				courier_package_nr: '600000276632432022076273',
				courier_inner_number: 'return_600000276632432022076273',
				courier_code: 'allegrokurier',
				package_type: '1',
			},
			{
				courier_package_nr: '31863813384',
				courier_inner_number: 'RETURN_1',
				courier_code: 'dhl',
				package_type: '',
			},
		]);

		expect(packages.map(({ isReturn }) => isReturn)).toEqual([
			false,
			true,
			true,
		]);
	});
});
