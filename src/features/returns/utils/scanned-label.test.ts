import { describe, expect, it } from 'vitest';
import type { ScoredCandidate } from '@/features/returns/model/order-scoring.types';
import type {
	TraceEntry,
	TraceState,
} from '@/features/returns/model/traces.types';
import { pickScannedLabel } from '@/features/returns/utils/scanned-label';

function packageEntry(id: string, text: string, state: TraceState): TraceEntry {
	return {
		id,
		kind: 'package',
		display: text,
		sources: ['code'],
		votes: 1,
		state,
		version: 1,
		seenAt: 0,
		query: {
			id: `${id}@1`,
			kind: 'package',
			pattern: [...text].map((char) => (char === '_' ? '' : char)),
		},
	};
}

function candidateWith(
	reasons: { traceId: string; kind: 'package' | 'phone'; bits: number }[],
): ScoredCandidate {
	return {
		orderId: 1,
		bits: 30,
		reasons: reasons.map((reason) => ({ ...reason, label: '' })),
	};
}

describe('pickScannedLabel', () => {
	it('zwraca numer paczki z tropu hit, wielkimi literami', () => {
		const label = pickScannedLabel({
			entries: [packageEntry('t1', 'jjd0001', 'hit')],
			candidate: candidateWith([
				{ traceId: 't1@1', kind: 'package', bits: 20 },
			]),
		});

		expect(label).toBe('JJD0001');
	});

	it('pomija trop z dziurą, bo to nie jest pełny numer', () => {
		const label = pickScannedLabel({
			entries: [packageEntry('t1', '6209996_', 'hit')],
			candidate: candidateWith([
				{ traceId: 't1@1', kind: 'package', bits: 20 },
			]),
		});

		expect(label).toBeUndefined();
	});

	it('pomija tropy inne niż paczka', () => {
		const label = pickScannedLabel({
			entries: [packageEntry('t1', '732000111', 'hit')],
			candidate: candidateWith([{ traceId: 't1@1', kind: 'phone', bits: 20 }]),
		});

		expect(label).toBeUndefined();
	});

	it('woli trop hit od mocniejszego tropu bez trafienia', () => {
		const label = pickScannedLabel({
			entries: [
				packageEntry('t1', 'AAAA1111', 'candidates'),
				packageEntry('t2', 'BBBB2222', 'hit'),
			],
			candidate: candidateWith([
				{ traceId: 't1@1', kind: 'package', bits: 25 },
				{ traceId: 't2@1', kind: 'package', bits: 15 },
			]),
		});

		expect(label).toBe('BBBB2222');
	});

	it('przy ręcznym wyborze bierze trop z największą liczbą bitów', () => {
		const label = pickScannedLabel({
			entries: [
				packageEntry('t1', 'AAAA1111', 'candidates'),
				packageEntry('t2', 'BBBB2222', 'candidates'),
			],
			candidate: candidateWith([
				{ traceId: 't1@1', kind: 'package', bits: 10 },
				{ traceId: 't2@1', kind: 'package', bits: 25 },
			]),
		});

		expect(label).toBe('BBBB2222');
	});
});
