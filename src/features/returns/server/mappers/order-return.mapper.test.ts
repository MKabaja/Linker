import { describe, expect, it } from 'vitest';
import { mapBaseLinkerOrderReturn } from '@/features/returns/server/mappers/order-return.mapper';
import type { BaseLinkerOrderReturn } from '@/features/returns/server/sources/baselinker.schemas';

function buildOrderReturn(
	overrides: Partial<BaseLinkerOrderReturn> = {},
): BaseLinkerOrderReturn {
	return {
		return_id: 9001,
		order_id: 356095152,
		reference_number: ' NZ5J/2026 ',
		order_return_source: 'allegro',
		status_id: 4,
		date_add: 1_795_000_000,
		delivery_fullname: ' Jan Kowalski ',
		delivery_postcode: '00-950',
		delivery_package_module: 'allegrokurier',
		delivery_package_nr: '600000276632432022076273',
		products: [
			{ name: ' Tusz ', sku: 'T-1', ean: '5901234567890', quantity: 2 },
		],
		...overrides,
	};
}

describe('mapBaseLinkerOrderReturn', () => {
	it('mapuje pola zwrotu Allegro', () => {
		expect(mapBaseLinkerOrderReturn(buildOrderReturn())).toEqual({
			returnId: 9001,
			orderId: 356095152,
			referenceNumber: 'NZ5J/2026',
			packageNumber: '600000276632432022076273',
			packageModule: 'allegrokurier',
			source: 'allegro',
			statusId: 4,
			fullName: 'Jan Kowalski',
			postcode: '00950',
			products: [
				{ name: 'Tusz', ean: '5901234567890', sku: 'T-1', quantity: 2 },
			],
			dateAdd: new Date(1_795_000_000_000),
		});
	});

	it('zachowuje numer referencyjny tiktokeu i normalizuje numer paczki', () => {
		const mapped = mapBaseLinkerOrderReturn(
			buildOrderReturn({
				reference_number: 'PL|4035307237239527528',
				order_return_source: 'tiktokeu',
				delivery_package_nr: 'px 7758146312',
			}),
		);

		expect(mapped.referenceNumber).toBe('PL|4035307237239527528');
		expect(mapped.packageNumber).toBe('PX7758146312');
	});

	it('zwrot bez paczki ma pusty numer i moduł', () => {
		const mapped = mapBaseLinkerOrderReturn(
			buildOrderReturn({
				delivery_package_nr: '',
				delivery_package_module: '',
				products: [],
			}),
		);

		expect(mapped.packageNumber).toBe('');
		expect(mapped.packageModule).toBe('');
		expect(mapped.products).toEqual([]);
	});
});
