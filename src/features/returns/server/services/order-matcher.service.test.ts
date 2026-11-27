import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderIndexEntry } from '@/features/returns/model/order-index.types';
import type { TraceQuery } from '@/features/returns/model/traces.types';
import { generateOrders } from '@/features/returns/utils/fixtures.test-helper';
import { parseNumberRead } from '@/features/returns/utils/pattern-parser';

const LIVE_ORDER_ID = 300_000_123;

const { findRemoteOrderById } = vi.hoisted(() => ({
	findRemoteOrderById: vi.fn(),
}));

vi.mock('@/features/returns/server/repositories/indexed-orders.cache', () => ({
	getIndexedOrders: async () => generateOrders(200),
	invalidateIndexedOrders: () => undefined,
}));
vi.mock(
	'@/features/returns/server/repositories/order-index.repository',
	() => ({
		upsertIndexedOrders: async () => undefined,
	}),
);
vi.mock(
	'@/features/returns/server/repositories/remote-orders.repository',
	() => ({
		findRemoteOrderById,
		findRemoteOrderByExternalId: vi.fn(),
	}),
);

describe('matchOrdersByTraces', () => {
	beforeEach(() => {
		findRemoteOrderById.mockResolvedValue({
			status: 'ok',
			data: { order: { orderId: LIVE_ORDER_ID } } as OrderIndexEntry,
		});
	});

	it('zwraca trafienie BaseLinkera na żywo jako kandydata, nie jako auto', async () => {
		const { matchOrdersByTraces } = await import(
			'@/features/returns/server/services/order-matcher.service'
		);
		const trace: TraceQuery = {
			id: 't1@1',
			kind: 'orderId',
			pattern: parseNumberRead(String(LIVE_ORDER_ID)),
		};

		const { result, liveLookupCount } = await matchOrdersByTraces(
			[trace],
			new Date(),
		);

		expect(liveLookupCount).toBe(1);
		expect(result.decision).toBe('candidates');
		expect(result.candidates[0]?.orderId).toBe(LIVE_ORDER_ID);
	});

	it('kod zwrotu rozwiązuje przekazana funkcja wyszukująca, jednym wywołaniem', async () => {
		const { matchOrdersByTraces } = await import(
			'@/features/returns/server/services/order-matcher.service'
		);
		const targetOrderId = generateOrders(200)[5].orderId;
		const findOrderIdsByReturnReference = vi.fn(
			async (references: string[]) =>
				new Map(references.map((reference) => [reference, targetOrderId])),
		);
		const trace: TraceQuery = {
			id: 'r1@1',
			kind: 'returnReference',
			pattern: [...'NZ5J/2026'],
		};

		const { result } = await matchOrdersByTraces([trace, trace], new Date(), {
			findOrderIdsByReturnReference,
		});

		expect(findOrderIdsByReturnReference).toHaveBeenCalledExactlyOnceWith([
			'NZ5J/2026',
		]);
		expect(result.decision).toBe('auto');
		expect(result.candidates[0]?.orderId).toBe(targetOrderId);
	});
});
