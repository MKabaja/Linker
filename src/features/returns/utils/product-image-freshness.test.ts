import { describe, expect, it } from 'vitest';
import { selectStaleProductIds } from './product-image-freshness';

const NOW = new Date('2026-11-27T12:00:00Z');
const DAY_MILLISECONDS = 24 * 60 * 60_000;

function buildRecord(productId: number, ageInDays: number) {
	return {
		productId,
		ean: '',
		imageUrl: '',
		syncedAt: new Date(NOW.getTime() - ageInDays * DAY_MILLISECONDS),
	};
}

describe('selectStaleProductIds', () => {
	it('zwraca brakujące i starsze niż 30 dni', () => {
		expect(
			selectStaleProductIds({
				productIds: [1, 2, 3, 4],
				records: [buildRecord(1, 5), buildRecord(2, 31), buildRecord(3, 30)],
				now: NOW,
			}),
		).toEqual([2, 4]);
	});
});
