import { describe, expect, it } from 'vitest';
import type { PendingOrderReturn } from '@/features/returns/model/order-returns.types';
import { toPendingReturnView } from '@/features/returns/server/mappers/pending-return.mapper';

function buildPendingReturn(
	overrides: Partial<PendingOrderReturn> = {},
): PendingOrderReturn {
	return {
		returnId: 9001,
		orderId: 356095152,
		referenceNumber: 'NZ5J/2026',
		packageNumber: '600000276632432022076273',
		fullName: 'Jan Kowalski',
		postcode: '00950',
		products: [{ name: 'Tusz', ean: '590', sku: 'T-1', quantity: 2 }],
		dateAdd: new Date('2026-11-20T10:00:00Z'),
		source: 'allegro',
		...overrides,
	};
}

describe('toPendingReturnView', () => {
	it('formatuje kod pocztowy z kreską i datę jako ISO', () => {
		const view = toPendingReturnView(buildPendingReturn());

		expect(view.postcode).toBe('00-950');
		expect(view.addedAt).toBe('2026-11-20T10:00:00.000Z');
	});

	it('zostawia niepełny kod pocztowy bez zmian', () => {
		expect(
			toPendingReturnView(buildPendingReturn({ postcode: '' })).postcode,
		).toBe('');
	});

	it('przekazuje produkty tylko z nazwą i ilością', () => {
		expect(toPendingReturnView(buildPendingReturn()).products).toEqual([
			{ name: 'Tusz', quantity: 2 },
		]);
	});
});
