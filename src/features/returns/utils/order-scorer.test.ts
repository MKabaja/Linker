import { describe, expect, it } from 'vitest';
import type {
	NumberTraceQuery,
	TraceQuery,
} from '@/features/returns/model/traces.types';
import {
	generateOrders,
	INPOST_PREFIX,
	makeOrder,
	type OrderOverrides,
	SCORING_OPTIONS,
} from '@/features/returns/utils/fixtures.test-helper';
import { scoreOrders } from '@/features/returns/utils/order-scorer';
import {
	parseNameMask,
	parseNumberRead,
	parsePhoneMask,
} from '@/features/returns/utils/pattern-parser';

const BASE_ORDERS = generateOrders(10_000);
const TARGET_ID = 399_000_001;
const PERFORMANCE_RUNS = 10;
const MAX_AVERAGE_MILLISECONDS = 100;

function withTarget(overrides: OrderOverrides) {
	return [...BASE_ORDERS, makeOrder(overrides)];
}

function phoneTrace(id: string, mask: string): TraceQuery {
	return { id, kind: 'phone', ...parsePhoneMask(mask) };
}

function nameTrace(id: string, mask: string): TraceQuery {
	return { id, kind: 'name', prefixes: parseNameMask(mask) };
}

function packageTrace(id: string, text: string): NumberTraceQuery {
	return { id, kind: 'package', pattern: parseNumberRead(text) };
}

describe('scoreOrders', () => {
	it('odczyt z jedną cyfrą 5 zamiast 6 trafia właściwy numer (auto)', () => {
		const number = `${INPOST_PREFIX}61234567890166`;
		const orders = withTarget({ orderId: TARGET_ID, packageNumbers: [number] });
		const misread = `${number.slice(0, -2)}56`;

		const result = scoreOrders(
			[packageTrace('p', misread)],
			orders,
			SCORING_OPTIONS,
		);

		expect(result.decision).toBe('auto');
		expect(result.candidates[0].orderId).toBe(TARGET_ID);
		expect(result.candidates[0].reasons[0].label).toMatch(/1 cyfra różna/);
	});

	it('prefiks InPost sam nie trafia w nic konkretnego (≈ 0 bitów)', () => {
		const result = scoreOrders(
			[packageTrace('p', INPOST_PREFIX)],
			BASE_ORDERS,
			SCORING_OPTIONS,
		);

		expect(result.traces[0].matches).toBeGreaterThan(1000);
		expect(result.traces[0].bits).toBeLessThan(1);
		expect(result.decision).toBe('none');
	});

	it('telefon z 6 znanymi cyframi wygrywa sam', () => {
		const orders = withTarget({ orderId: TARGET_ID, phoneDigits: '732012383' });

		const result = scoreOrders(
			[phoneTrace('t', '7320***83')],
			orders,
			SCORING_OPTIONS,
		);

		expect(result.decision).toBe('auto');
		expect(result.candidates[0].orderId).toBe(TARGET_ID);
		expect(result.candidates[0].reasons[0].label).toBe('telefon 7320___83');
	});

	it('same inicjały nie przekraczają progu', () => {
		const orders = withTarget({
			orderId: TARGET_ID,
			firstNameNorm: 'monika',
			lastNameNorm: 'kalina',
		});

		const result = scoreOrders(
			[nameTrace('n', 'm*** ka***')],
			orders,
			SCORING_OPTIONS,
		);

		expect(
			result.candidates.every((candidate) => candidate.bits < result.threshold),
		).toBe(true);
		expect(result.decision).not.toBe('auto');
	});

	it('inicjały i 2 cyfry telefonu razem przekraczają próg', () => {
		const orders = withTarget({
			orderId: TARGET_ID,
			firstNameNorm: 'monika',
			lastNameNorm: 'kalina',
			phoneDigits: '600000483',
		});

		const result = scoreOrders(
			[nameTrace('n', 'm*** ka***'), phoneTrace('t', '*******83')],
			orders,
			SCORING_OPTIONS,
		);

		const target = result.candidates.find(
			(candidate) => candidate.orderId === TARGET_ID,
		);
		expect(target, 'brak kandydata docelowego').toBeDefined();
		expect(target?.bits).toBeGreaterThanOrEqual(result.threshold);
		expect(result.candidates[0].orderId).toBe(TARGET_ID);
	});

	it('dwóch kandydatów z podobnym wynikiem → lista zamiast automatu', () => {
		const orders = [
			...withTarget({ orderId: TARGET_ID, phoneDigits: '732012383' }),
			makeOrder({ orderId: TARGET_ID + 1, phoneDigits: '732099383' }),
		];

		const result = scoreOrders(
			[phoneTrace('u', '732****83')],
			orders,
			SCORING_OPTIONS,
		);

		expect(result.decision).toBe('candidates');
		expect(
			result.candidates
				.slice(0, 2)
				.map((candidate) => candidate.orderId)
				.sort(),
		).toEqual([TARGET_ID, TARGET_ID + 1]);
	});

	it('sam kod pocztowy, nawet unikalny, nie daje auto', () => {
		const orders = withTarget({ orderId: TARGET_ID, postcode: '27315' });

		const result = scoreOrders(
			[{ id: 'z', kind: 'postcode', pattern: [...'27315'] }],
			orders,
			SCORING_OPTIONS,
		);

		expect(result.candidates[0].orderId).toBe(TARGET_ID);
		expect(result.candidates[0].bits).toBeGreaterThanOrEqual(result.threshold);
		expect(result.decision).toBe('candidates');
	});

	it('same słabe tropy (imię, kod, krótki telefon) ponad progiem → kandydaci', () => {
		const orders = withTarget({
			orderId: TARGET_ID,
			firstNameNorm: 'monika',
			lastNameNorm: 'kalina',
			phoneDigits: '600000483',
			postcode: '31123',
		});

		const result = scoreOrders(
			[
				nameTrace('n', 'm*** ka***'),
				phoneTrace('t', '*******83'),
				{ id: 'z', kind: 'postcode', pattern: [...'31123'] },
			],
			orders,
			SCORING_OPTIONS,
		);

		expect(result.candidates[0].orderId).toBe(TARGET_ID);
		expect(result.candidates[0].bits).toBeGreaterThanOrEqual(result.threshold);
		expect(result.decision).toBe('candidates');
	});

	describe('przybliżony numer paczki z jednego odczytu OCR', () => {
		const number = `${INPOST_PREFIX}61234567890166`;
		const orders = withTarget({
			orderId: TARGET_ID,
			packageNumbers: [number],
			firstNameNorm: 'monika',
			lastNameNorm: 'kalina',
		});

		function scoreSingleRead(read: string, isSingleOcrRead: boolean) {
			return scoreOrders(
				[
					{ ...packageTrace('p', read), isSingleOcrRead },
					nameTrace('n', 'm*** ka***'),
				],
				orders,
				SCORING_OPTIONS,
			);
		}

		it('z inną cyfrą (koszt > 0,3) daje kandydatów, a z drugim głosem auto', () => {
			const misread = `${number.slice(0, -1)}4`;

			const single = scoreSingleRead(misread, true);
			const confirmed = scoreSingleRead(misread, false);

			expect(single.candidates[0].orderId).toBe(TARGET_ID);
			expect(single.decision).toBe('candidates');
			expect(confirmed.decision).toBe('auto');
		});

		it('z jedną typową pomyłką OCR (5 zamiast 6) daje auto', () => {
			const misread = `${number.slice(0, -2)}56`;

			const result = scoreSingleRead(misread, true);

			expect(result.decision).toBe('auto');
			expect(result.candidates[0].orderId).toBe(TARGET_ID);
		});
	});

	it('trop bez dopasowań daje 0 bitów', () => {
		const result = scoreOrders(
			[packageTrace('p', '999999999999999999999999')],
			BASE_ORDERS,
			SCORING_OPTIONS,
		);

		expect(result.traces[0]).toEqual({ traceId: 'p', matches: 0, bits: 0 });
		expect(result.decision).toBe('none');
	});

	it('wydajność: 15 tys. zamówień × 12 tropów', () => {
		const orders = generateOrders(15_000, 7);
		const traces: TraceQuery[] = [
			packageTrace('p1', `${INPOST_PREFIX}61234567890166`),
			packageTrace('p2', '1012345678901U'),
			packageTrace('p3', INPOST_PREFIX),
			packageTrace('p4', '%0012345678901234567'),
			{ id: 'o1', kind: 'orderId', pattern: parseNumberRead('312345678') },
			{ id: 'e1', kind: 'externalId', pattern: parseNumberRead('1234X567890') },
			{ id: 'z1', kind: 'postcode', pattern: parseNumberRead('31123') },
			phoneTrace('t1', '7320***83'),
			phoneTrace('t2', '732******3'),
			phoneTrace('t3', '*******83'),
			nameTrace('n1', 'm*** ka***'),
			nameTrace('n2', 'a*** n***'),
		];
		scoreOrders(traces, orders, SCORING_OPTIONS);

		const start = performance.now();
		for (let run = 0; run < PERFORMANCE_RUNS; run++) {
			scoreOrders(traces, orders, SCORING_OPTIONS);
		}
		const averageMilliseconds = (performance.now() - start) / PERFORMANCE_RUNS;

		expect(averageMilliseconds).toBeLessThan(MAX_AVERAGE_MILLISECONDS);
	});
});
