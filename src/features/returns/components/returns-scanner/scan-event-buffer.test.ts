import { describe, expect, it } from 'vitest';
import type { ClientEvent } from '@/features/returns/model/event-log.schemas';
import { appendEvent, markReadAsNew, takeBatch } from './scan-event-buffer';

const SCAN_ID = '3f2b8c1e-7a4d-4e6f-9b0a-1c2d3e4f5a6b';

function makeEvent(clientAt: number): ClientEvent {
	return {
		type: 'scan.decision',
		scanId: SCAN_ID,
		clientAt,
		decision: 'auto',
		orderId: 1,
	};
}

describe('appendEvent', () => {
	it('zachowuje najnowsze zdarzenia, gdy bufor jest pełny', () => {
		const buffer = [makeEvent(1), makeEvent(2), makeEvent(3)];

		const result = appendEvent(buffer, makeEvent(4), 3);

		expect(result.map((event) => event.clientAt)).toEqual([2, 3, 4]);
	});
});

describe('takeBatch', () => {
	it('bierze najstarsze zdarzenia, a resztę zostawia', () => {
		const buffer = [makeEvent(1), makeEvent(2), makeEvent(3)];

		const { batch, rest } = takeBatch(buffer, 2);

		expect(batch.map((event) => event.clientAt)).toEqual([1, 2]);
		expect(rest.map((event) => event.clientAt)).toEqual([3]);
	});
});

describe('markReadAsNew', () => {
	it('pomija powtórzony tekst z tego samego źródła, ignorując spacje i wielkość liter', () => {
		const seen = new Set<string>();
		const read = { kind: 'package', source: 'rapid', text: '6209 9996' };

		expect(markReadAsNew(seen, read)).toBe(true);
		expect(markReadAsNew(seen, { ...read, text: ' 6209  9996 ' })).toBe(false);
	});

	it('uznaje ten sam tekst z innego źródła za nowy odczyt', () => {
		const seen = new Set<string>();

		markReadAsNew(seen, { kind: 'package', source: 'rapid', text: '6209' });

		expect(
			markReadAsNew(seen, { kind: 'package', source: 'code', text: '6209' }),
		).toBe(true);
	});
});
