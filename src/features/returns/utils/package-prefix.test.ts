import { describe, expect, it } from 'vitest';
import { repairPrefix } from '@/features/returns/utils/package-prefix';

function repair(text: string, prefix = '6209996'): string {
	return (repairPrefix([...text], prefix, 24) ?? [...text]).join('');
}

describe('repairPrefix', () => {
	it('poprawia błędny początek numeru InPost (odczyt z etykiety zwrotnej)', () => {
		expect(repair('570999668641300663603')).toBe('620999668641300663603');
	});

	it('zgubiona pierwsza cyfra i nadmiar na końcu', () => {
		expect(repair('2099966864130066360331299')).toBe(
			'620999668641300663603312',
		);
	});

	it('inny częsty początek (5210000)', () => {
		expect(repair('57100001690550014625994', '5210000')).toBe(
			'52100001690550014625994',
		);
	});

	it('nie rusza numerów innych przewoźników', () => {
		expect(repair('00259007738012345678')).toBe('00259007738012345678');
	});
});
