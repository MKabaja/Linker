import { describe, expect, it } from 'vitest';
import type {
	ReturnItem,
	ReturnRecord,
} from '@/features/returns/model/returns.types';
import { buildReturnsCsv } from '@/features/returns/utils/returns-csv';

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

function buildItem(overrides: Partial<ReturnItem> = {}): ReturnItem {
	return {
		id: 1,
		orderProductId: 10,
		name: 'Krem do rąk',
		ean: '5900000000001',
		sku: 'KR-1',
		quantityOrdered: 2,
		quantityReceived: 2,
		condition: 'accepted',
		...overrides,
	};
}

function buildReturn(overrides: Partial<ReturnRecord> = {}): ReturnRecord {
	return {
		id: 1,
		orderId: 353637496,
		source: 'allegro',
		note: '',
		receivedBy: { id: 1, name: 'Ania' },
		createdAt: new Date('2026-11-25T08:05:00Z'),
		updatedAt: new Date('2026-11-25T08:05:00Z'),
		kind: 'full',
		items: [buildItem()],
		...overrides,
	};
}

describe('buildReturnsCsv', () => {
	it('zaczyna się od BOM, ma średniki i wiersze CRLF z godziną w Polsce', () => {
		const csv = buildReturnsCsv([buildReturn()]);

		expect(csv).toBe(
			`${BYTE_ORDER_MARK}ID_BASE;Źródło;Rodzaj;Co zwrócono;Notatka;Godzina;Przyjął\r\n` +
				'353637496;allegro;Pełny;Krem do rąk ×2;;09:05;Ania',
		);
	});

	it('pomija pozycje bez przyjętych sztuk i oznacza uszkodzone', () => {
		const csv = buildReturnsCsv([
			buildReturn({
				kind: 'partial',
				items: [
					buildItem({ name: 'Szampon', quantityReceived: 0 }),
					buildItem({
						name: 'Mydło',
						quantityReceived: 1,
						condition: 'damaged',
					}),
				],
			}),
		]);

		expect(csv.split('\r\n')[1]).toBe(
			'353637496;allegro;Częściowy;Mydło ×1 (uszkodzone);;09:05;Ania',
		);
	});

	it('cytuje średniki i cudzysłowy oraz rozbraja formuły', () => {
		const csv = buildReturnsCsv([
			buildReturn({
				note: 'brak "pudełka"; pęknięty',
				source: '=HYPERLINK("x")',
			}),
		]);
		const [, row] = csv.split('\r\n');

		expect(row).toContain(';"brak ""pudełka""; pęknięty";');
		expect(row).toContain(`;"'=HYPERLINK(""x"")";`);
	});
});
