import { describe, expect, it } from 'vitest';
import { matchName, matchPhone } from '@/features/returns/utils/contact-match';
import { parsePhoneMask } from '@/features/returns/utils/pattern-parser';

describe('matchName', () => {
	it('dowolna kolejność imienia i nazwiska', () => {
		expect(matchName(['m', 'ka'], 'monika', 'kalina')).toBe(true);
		expect(matchName(['ka', 'm'], 'monika', 'kalina')).toBe(true);
		expect(matchName(['m', 'ka'], 'monika', 'nowak')).toBe(false);
	});
});

describe('matchPhone', () => {
	it('telefon: wzorzec pozycyjny i kotwice', () => {
		expect(matchPhone(parsePhoneMask('7320***83'), '732012383')).toBe(0);
		expect(
			matchPhone(
				{ pattern: null, anchored: { prefix: '732', suffix: '3' } },
				'732012383',
			),
		).toBe(0);
		expect(
			matchPhone(
				{ pattern: null, anchored: { prefix: '732', suffix: '4' } },
				'732012383',
				1,
			),
		).toBe(1);
	});
});
