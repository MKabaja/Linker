import { describe, expect, it } from 'vitest';
import { parsePhoneMask } from '@/features/returns/utils/pattern-parser';
import {
	isShopPhone,
	isShopText,
	isShopTrace,
} from '@/features/returns/utils/shop-exclusions';

describe('wykluczenia sklepu', () => {
	it('telefon sklepu nie jest tropem', () => {
		expect(isShopPhone('500109093')).toBe(true);
		expect(isShopPhone('48500109093')).toBe(true);
		expect(
			isShopTrace({ id: '', kind: 'phone', ...parsePhoneMask('500**9093') }),
		).toBe(true);
		expect(
			isShopTrace({ id: '', kind: 'phone', ...parsePhoneMask('7320***83') }),
		).toBe(false);
	});

	it('adres sklepu', () => {
		expect(isShopText('32-432 Pcim')).toBe(true);
		expect(isShopText('Drogeria XYZ')).toBe(true);
		expect(isShopText('ul. Kozacka 5')).toBe(true);
		expect(isShopText('620999669102')).toBe(false);
	});
});
