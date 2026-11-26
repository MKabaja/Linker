import { describe, expect, it } from 'vitest';
import { createOcrResponse } from '@/features/returns/utils/ocr.test-helper';
import {
	parseNumberRead,
	parsePhoneMask,
} from '@/features/returns/utils/pattern-parser';
import { readsFromOcr } from '@/features/returns/utils/read-classifier';
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

	it('kod pocztowy sklepu z jedną błędną cyfrą (30-432 zamiast 32-432) nie jest tropem', () => {
		const reads = readsFromOcr(
			createOcrResponse([
				['tess-general', '30-432'],
				['rapid', '32-482'],
				['rapid', '31-123'],
			]),
		);

		expect(reads.map((read) => read.text)).toEqual(['31-123']);
	});

	it('kod pocztowy różny od kodu sklepu na dwóch pozycjach zostaje tropem', () => {
		expect(
			isShopTrace({
				id: '',
				kind: 'postcode',
				pattern: parseNumberRead('31-532'),
			}),
		).toBe(false);
	});
});
