import { describe, expect, it } from 'vitest';
import {
	COST_CONFUSION,
	matchCost,
	matchPackage,
} from '@/features/returns/utils/pattern-cost';

describe('matchCost', () => {
	it('koszty pozycji: zgodny, dziura, alternatywa, pomyłka, inna', () => {
		expect(matchCost(['1', '', '3'], '123')).toBe(0);
		expect(matchCost(['1', '56', '3'], '163')).toBe(0.1);
		expect(matchCost(['1', '5', '3'], '163')).toBe(COST_CONFUSION);
		expect(matchCost(['1', '4', '3'], '163')).toBe(1);
	});

	it('różnica długości o 1 z karą, większa → Infinity', () => {
		expect(matchCost([...'12345'], '1245')).toBe(0.5);
		expect(matchCost([...'123'], '12345')).toBe(Number.POSITIVE_INFINITY);
	});

	it('maxCost przerywa liczenie', () => {
		expect(matchCost([...'99999'], '12345', 1)).toBe(Number.POSITIVE_INFINITY);
	});

	it('numer paczki zawarty w dłuższym kodzie', () => {
		expect(
			matchPackage([...'%00123456789012345'], '123456789012345'),
		).toBeLessThan(1);
	});
});
