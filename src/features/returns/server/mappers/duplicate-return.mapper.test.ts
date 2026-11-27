import { describe, expect, it } from 'vitest';
import type { ReturnRecord } from '@/features/returns/model/returns.types';
import { toDuplicateReturnWarning } from '@/features/returns/server/mappers/duplicate-return.mapper';

function buildReturnRecord(
	overrides: Partial<ReturnRecord> = {},
): ReturnRecord {
	return {
		id: 7,
		orderId: 356_648_562,
		source: 'allegro',
		waproOrderNumber: '',
		wmsCode: '',
		note: '',
		matchedBy: 'auto',
		scannedLabel: null,
		correction: null,
		receivedBy: { id: 1, name: 'Ania' },
		createdAt: new Date('2026-11-25T22:30:00.000Z'),
		updatedAt: new Date('2026-11-25T22:30:00.000Z'),
		kind: 'partial',
		deletion: null,
		items: [],
		...overrides,
	};
}

describe('toDuplicateReturnWarning', () => {
	it('shows when (in Warsaw time), by whom and what kind of return was received', () => {
		expect(toDuplicateReturnWarning(buildReturnRecord())).toEqual({
			returnId: 7,
			orderId: 356_648_562,
			receivedAt: new Date('2026-11-25T22:30:00.000Z'),
			receivedAtLabel: '25.11.2026, 23:30',
			receivedByName: 'Ania',
			kind: 'partial',
			kindLabel: 'Częściowy',
			deletedAtLabel: null,
			deletedByName: null,
		});
	});

	it('shows when (in Warsaw time) and by whom a return was deleted', () => {
		const warning = toDuplicateReturnWarning(
			buildReturnRecord({
				deletion: {
					at: new Date('2026-11-26T08:15:00.000Z'),
					byName: 'Basia',
				},
			}),
		);

		expect(warning.deletedAtLabel).toBe('26.11.2026, 09:15');
		expect(warning.deletedByName).toBe('Basia');
	});

	it('labels a full return', () => {
		const warning = toDuplicateReturnWarning(
			buildReturnRecord({ kind: 'full' }),
		);

		expect(warning.kindLabel).toBe('Pełny');
	});
});
