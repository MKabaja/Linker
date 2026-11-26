import { describe, expect, it } from 'vitest';
import { demoReturnsFileSchema } from '@/features/returns/model/demo-import.schemas';
import {
	parseDemoRecords,
	toImportedReturn,
} from '@/features/returns/server/mappers/demo-return.mapper';

const CREATED_AT_MS = 1_794_917_041_131;
const UPDATED_AT_MS = 1_794_917_103_480;

function buildRawRecord(overrides: Record<string, unknown> = {}) {
	return {
		orderId: 356_648_562,
		source: 'allegro',
		createdAt: CREATED_AT_MS,
		updatedAt: UPDATED_AT_MS,
		note: 'uszkodzone pudełko',
		isDone: true,
		items: [
			{
				key: '648012894',
				name: 'Krem',
				ean: '5900000000001',
				sku: 'KR-1',
				quantityOrdered: 2,
				quantityReceived: 1,
			},
			{
				key: 'extra-1',
				name: 'Gratis',
				ean: '',
				sku: '',
				quantityOrdered: 0,
				quantityReceived: 1,
			},
		],
		...overrides,
	};
}

describe('parseDemoRecords', () => {
	it('keeps valid records and remembers positions of invalid ones', () => {
		const { records, invalidIndexes } = parseDemoRecords([
			buildRawRecord(),
			buildRawRecord({ orderId: '356648562' }),
			buildRawRecord({ items: [{ key: '1', quantityOrdered: -1 }] }),
		]);

		expect(records).toHaveLength(1);
		expect(invalidIndexes).toEqual([1, 2]);
	});

	it('accepts dates as milliseconds or ISO strings and defaults a missing note', () => {
		const { records } = parseDemoRecords([
			buildRawRecord({
				createdAt: '2026-11-25T10:00:00.000Z',
				note: undefined,
			}),
		]);

		expect(records[0]?.createdAt).toEqual(new Date('2026-11-25T10:00:00.000Z'));
		expect(records[0]?.note).toBe('');
	});
});

describe('demoReturnsFileSchema', () => {
	it('reads records from an array or from object values', () => {
		const record = buildRawRecord();

		expect(demoReturnsFileSchema.parse([record])).toEqual([record]);
		expect(demoReturnsFileSchema.parse({ 356648562: record })).toEqual([
			record,
		]);
	});
});

describe('toImportedReturn', () => {
	it('maps a demo record to an imported return without an employee', () => {
		const { records } = parseDemoRecords([buildRawRecord()]);
		const [record] = records;

		if (!record) {
			throw new Error('Rekord testowy nie przeszedł walidacji.');
		}

		expect(toImportedReturn(record)).toEqual({
			orderId: 356_648_562,
			source: 'allegro',
			note: 'uszkodzone pudełko',
			receivedBy: null,
			matchedBy: 'imported',
			scannedLabel: null,
			createdAt: new Date(CREATED_AT_MS),
			updatedAt: new Date(UPDATED_AT_MS),
			items: [
				{
					position: 0,
					orderProductId: 648_012_894,
					name: 'Krem',
					ean: '5900000000001',
					sku: 'KR-1',
					quantityOrdered: 2,
					quantityReceived: 1,
					condition: 'accepted',
				},
				{
					position: 1,
					orderProductId: null,
					name: 'Gratis',
					ean: '',
					sku: '',
					quantityOrdered: 0,
					quantityReceived: 1,
					condition: 'accepted',
				},
			],
		});
	});
});
