import { describe, expect, it } from 'vitest';
import type {
	RawRead,
	TraceEntry,
} from '@/features/returns/model/traces.types';
import { parseNumberRead } from '@/features/returns/utils/pattern-parser';
import { buildReadEvents, buildTraceStateEvents } from './scan-events';

function makePackageRead(text: string): RawRead {
	return {
		kind: 'package',
		source: 'rapid',
		text,
		query: { id: '', kind: 'package', pattern: parseNumberRead(text) },
	};
}

function makeEntry(state: TraceEntry['state'], version: number): TraceEntry {
	const read = makePackageRead('620999648845787530634222');
	return {
		id: 't1',
		kind: 'package',
		display: 'Numer 6209…4222',
		sources: ['rapid'],
		votes: 1,
		state,
		version,
		seenAt: 0,
		query: read.query,
	};
}

describe('buildReadEvents', () => {
	it('zapisuje nowy odczyt raz, a powtórkę pomija', () => {
		const seen = new Set<string>();
		const read = makePackageRead('620999648845787530634222');

		const first = buildReadEvents([read], seen);
		const second = buildReadEvents([read], seen);

		expect(first).toEqual([
			expect.objectContaining({
				type: 'scan.read',
				kind: 'package',
				source: 'rapid',
				pattern: '620999648845787530634222',
				text: '620999648845787530634222',
			}),
		]);
		expect(second).toEqual([]);
	});
});

describe('buildTraceStateEvents', () => {
	it('zgłasza tylko zmianę stanu albo wersji tropu', () => {
		const lastLogged = new Map<string, string>();

		const first = buildTraceStateEvents([makeEntry('reading', 1)], lastLogged);
		const repeated = buildTraceStateEvents(
			[makeEntry('reading', 1)],
			lastLogged,
		);
		const changed = buildTraceStateEvents([makeEntry('hit', 1)], lastLogged);

		expect(first).toHaveLength(1);
		expect(repeated).toEqual([]);
		expect(changed).toEqual([
			expect.objectContaining({ type: 'scan.trace-state', state: 'hit' }),
		]);
	});
});
