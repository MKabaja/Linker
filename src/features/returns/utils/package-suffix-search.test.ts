import { describe, expect, it } from 'vitest';
import type { TraceQuery } from '@/features/returns/model/traces.types';
import {
	LABEL_CODES,
	makeOrder,
} from '@/features/returns/utils/fixtures.test-helper';
import { findOrdersByPackageSuffix } from '@/features/returns/utils/package-suffix-search';
import { parseNumberRead } from '@/features/returns/utils/pattern-parser';

const SECONDS_PER_DAY = 86_400;
const NEWEST_SECONDS = 1_795_000_000;

function orderWith(orderId: number, packageNumber: string, ageInDays: number) {
	const date = NEWEST_SECONDS - ageInDays * SECONDS_PER_DAY;
	return makeOrder({
		orderId,
		packageNumbers: [packageNumber],
		dateAdd: date,
		dateConfirmed: date,
	});
}

const ORDERS = [
	orderWith(1, LABEL_CODES.inpost[0], 5),
	orderWith(2, '620999667432432409556164', 1),
	orderWith(3, LABEL_CODES.dpdParcel[0], 2),
	orderWith(4, '1055513870000U', 3),
	orderWith(5, 'A0066RM3O6', 4),
];

describe('findOrdersByPackageSuffix', () => {
	it('znajduje po końcówce, od najnowszego zamówienia', () => {
		const result = findOrdersByPackageSuffix({
			suffix: '6164',
			orders: ORDERS,
		});

		expect(
			result.status === 'orders' &&
				result.matches.map((match) => match.order.orderId),
		).toEqual([2, 1]);
	});

	it('normalizuje końcówkę i dopasowuje litery', () => {
		const result = findOrdersByPackageSuffix({
			suffix: ' rm3-o6 ',
			orders: ORDERS,
		});

		expect(
			result.status === 'orders' &&
				result.matches.map((match) => match.packageNumber),
		).toEqual(['A0066RM3O6']);
	});

	it('filtruje po przewoźniku', () => {
		const result = findOrdersByPackageSuffix({
			suffix: '6164',
			orders: ORDERS,
			carrier: 'dpd',
		});

		expect(result).toEqual({ status: 'orders', matches: [] });
	});

	it('pomija zamówienia z przyjętym zwrotem', () => {
		const result = findOrdersByPackageSuffix({
			suffix: '329U',
			orders: ORDERS,
			carrier: 'dpd',
			excludedOrderIds: new Set([3]),
		});

		expect(result).toEqual({ status: 'orders', matches: [] });
	});

	it('częściowy odczyt z bieżącego skanu ustawia kolejność przed datą', () => {
		const traces: TraceQuery[] = [
			{
				id: 't1@1',
				kind: 'package',
				pattern: parseNumberRead('62099966743243240916'),
			},
		];

		const result = findOrdersByPackageSuffix({
			suffix: '6164',
			orders: ORDERS,
			traces,
		});

		expect(
			result.status === 'orders' &&
				result.matches.map((match) => match.order.orderId),
		).toEqual([1, 2]);
	});

	it('zwraca najwyżej 10 wyników', () => {
		const orders = Array.from({ length: 15 }, (_, index) =>
			orderWith(100 + index, `${String(index).padStart(20, '0')}6164`, index),
		);

		const result = findOrdersByPackageSuffix({ suffix: '6164', orders });

		expect(result.status === 'orders' && result.matches).toHaveLength(10);
	});

	it.each([
		['NZ5J/2026', 'NZ5J/2026'],
		['nz5j / 2026', 'NZ5J/2026'],
	])(
		'%s to kod zwrotu do rozwiązania przez wywołującego',
		(suffix, reference) => {
			expect(findOrdersByPackageSuffix({ suffix, orders: ORDERS })).toEqual({
				status: 'return-reference',
				reference,
			});
		},
	);

	it('końcówka krótsza niż 4 znaki', () => {
		expect(
			findOrdersByPackageSuffix({ suffix: '164', orders: ORDERS }),
		).toEqual({ status: 'too-short' });
	});
});
