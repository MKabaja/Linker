import { describe, expect, it } from 'vitest';
import type { TraceEntry } from '@/features/returns/model/traces.types';
import {
	createRandom,
	generateOrders,
	makeOrder,
	SCORING_OPTIONS,
} from '@/features/returns/utils/fixtures.test-helper';
import { createOcrResponse } from '@/features/returns/utils/ocr.test-helper';
import { scoreOrders } from '@/features/returns/utils/order-scorer';
import { patternToString } from '@/features/returns/utils/pattern-parser';
import {
	readFromBarcode,
	readsFromOcr,
} from '@/features/returns/utils/read-classifier';
import { createTraceCollector } from '@/features/returns/utils/trace-collector';

function readDigits(engine: string, text: string) {
	return readsFromOcr(createOcrResponse([[engine, text]]));
}

function patternTextOf({ query }: TraceEntry): string {
	return query.kind === 'name' ? '' : patternToString(query.pattern ?? []);
}

describe('createTraceCollector', () => {
	it('głosowanie z 3 odczytów naprawia cyfrę', () => {
		const collector = createTraceCollector();
		collector.addReads(readDigits('tess-digits', '620999669161234567890156'));
		collector.addReads(readDigits('tess-general', '620999669161234567890166'));
		const changed = collector.addReads(
			readDigits('tess-digits', '620999669161234567890166'),
		);

		const entries = collector.entries();
		expect(entries).toHaveLength(1);
		expect(entries[0].votes).toBe(3);
		expect(patternTextOf(entries[0])).toBe('620999669161234567890166');
		expect(changed, 'zmiana wzorca zgłoszona').toHaveLength(1);
	});

	it('remis daje alternatywy w slocie', () => {
		const collector = createTraceCollector();
		collector.addReads(readDigits('tess-digits', '620999669161234567890156'));
		collector.addReads(readDigits('tess-digits', '620999669161234567890166'));

		expect(patternTextOf(collector.entries()[0])).toBe(
			'6209996691612345678901[56]6',
		);
	});

	it('pojedynczy odczyt OCR krótkiego numeru czeka na drugi głos', () => {
		const collector = createTraceCollector();
		collector.addReads(readDigits('tess-general', 'Zam. 312345678'));
		expect(collector.queries()).toHaveLength(0);

		collector.addReads(readDigits('tess-digits', '312345678'));
		expect(collector.queries()).toHaveLength(1);
	});

	it('sprawdzony trop nie wymusza ponownego szukania, zmiana wzorca — tak', () => {
		const orders = generateOrders(2_000);
		const collector = createTraceCollector();
		collector.addReads(readDigits('tess-digits', '999999999999999999999991'));
		expect(collector.needsSearch()).toBe(true);

		collector.markResult(
			scoreOrders(collector.queries(), orders, SCORING_OPTIONS),
		);
		expect(collector.entries()[0].state).toBe('checked-none');
		expect(collector.needsSearch()).toBe(false);

		collector.addReads(readDigits('tess-digits', '999999999999999999999991'));
		expect(
			collector.needsSearch(),
			'ten sam wzorzec — bez ponownego szukania',
		).toBe(false);

		collector.addReads(readDigits('tess-digits', '999999999999999999999992'));
		collector.addReads(readDigits('tess-digits', '999999999999999999999992'));
		expect(collector.needsSearch(), 'wzorzec się zmienił').toBe(true);
		expect(collector.entries()[0].state).toBe('reading');
	});

	it('trafienie oznacza trop jako hit', () => {
		const orders = [
			...generateOrders(2_000),
			makeOrder({
				orderId: 399_000_001,
				packageNumbers: ['620999669161234567890166'],
			}),
		];
		const collector = createTraceCollector();
		const read = readFromBarcode('620999669161234567890166');
		expect(read).not.toBeNull();
		collector.addReads(read ? [read] : []);

		collector.markResult(
			scoreOrders(collector.queries(), orders, SCORING_OPTIONS),
		);

		const [entry] = collector.entries();
		expect(entry.state).toBe('hit');
		expect(entry.display).toBe('Kod 6209…0166');
	});

	it('limit liczby tropów', () => {
		const collector = createTraceCollector();
		const random = createRandom(1);
		for (let index = 0; index < 60; index++) {
			const number = Array.from({ length: 16 }, () =>
				Math.floor(random() * 10),
			).join('');
			collector.addReads(readDigits('tess-digits', number));
		}

		expect(collector.entries().length).toBeLessThanOrEqual(40);
	});
});
