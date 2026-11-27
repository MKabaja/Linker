import { describe, expect, it } from 'vitest';
import { defaultReturnsListFilters } from '@/features/returns/model/returns-list.constants';
import { returnsListSearchParamsSchema } from '@/features/returns/model/returns-page.schemas';
import { toReturnsListSearch } from '@/features/returns/utils/returns-list-query';

describe('toReturnsListSearch', () => {
	it('pomija wartości domyślne', () => {
		expect(toReturnsListSearch(defaultReturnsListFilters)).toBe('');
		expect(
			toReturnsListSearch({ ...defaultReturnsListFilters, date: '2026-11-27' }),
		).toBe('?date=2026-11-27');
	});

	it('zapisuje sortowanie, filtr i dzień', () => {
		expect(
			toReturnsListSearch({
				date: '2026-11-27',
				sort: 'order-asc',
				correction: 'without',
			}),
		).toBe('?date=2026-11-27&sort=order-asc&correction=without');
	});

	it('daje ten sam zakres po odczycie schematem', () => {
		const scope = {
			date: '2026-11-26',
			sort: 'scanned-asc',
			correction: 'with',
		} as const;
		const params = Object.fromEntries(
			new URLSearchParams(toReturnsListSearch(scope)),
		);

		expect(returnsListSearchParamsSchema.parse(params)).toEqual(scope);
	});
});

describe('returnsListSearchParamsSchema', () => {
	it('podstawia wartości domyślne dla braku i błędnych wartości', () => {
		expect(returnsListSearchParamsSchema.parse({})).toEqual({
			...defaultReturnsListFilters,
			date: undefined,
		});
		expect(
			returnsListSearchParamsSchema.parse({
				date: '27.11.2026',
				sort: 'random',
				correction: ['with', 'without'],
			}),
		).toEqual({ ...defaultReturnsListFilters, date: undefined });
	});
});
