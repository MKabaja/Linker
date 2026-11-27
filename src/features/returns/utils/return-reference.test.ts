import { describe, expect, it } from 'vitest';
import {
	indexOrderIdsByReturnReference,
	parseReturnReference,
} from './return-reference';

describe('indexOrderIdsByReturnReference', () => {
	it('używa kodu wielkimi literami w postaci kanonicznej', () => {
		const map = indexOrderIdsByReturnReference([
			{ referenceNumber: ' nz5j / 2026 ', orderId: 11 },
		]);

		expect(map.get('NZ5J/2026')).toBe(11);
	});

	it('przy powtórzonym kodzie zostawia pierwszy wiersz', () => {
		const map = indexOrderIdsByReturnReference([
			{ referenceNumber: 'NZ5J/2026', orderId: 2 },
			{ referenceNumber: 'nz5j/2026', orderId: 1 },
		]);

		expect(map.get('NZ5J/2026')).toBe(2);
		expect(map.size).toBe(1);
	});

	it('pomija puste numery referencyjne', () => {
		expect(
			indexOrderIdsByReturnReference([{ referenceNumber: '  ', orderId: 3 }])
				.size,
		).toBe(0);
	});

	it('zachowuje niestandardowy numer wielkimi literami', () => {
		const map = indexOrderIdsByReturnReference([
			{ referenceNumber: 'zw-1', orderId: 4 },
		]);

		expect(map.get('ZW-1')).toBe(4);
	});
});

describe('parseReturnReference', () => {
	it('łączy kod rozdzielony spacjami', () => {
		expect(parseReturnReference('NZ5J / 2026')).toBe('NZ5J/2026');
	});
});
