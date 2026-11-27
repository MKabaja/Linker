import { describe, expect, it } from 'vitest';
import { LABEL_CODES } from '@/features/returns/utils/fixtures.test-helper';
import { createOcrResponse } from '@/features/returns/utils/ocr.test-helper';
import {
	parseNameMask,
	parseNumberRead,
	parsePhoneMask,
} from '@/features/returns/utils/pattern-parser';
import {
	readFromBarcode,
	readsFromOcr,
} from '@/features/returns/utils/read-classifier';
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

	it.each([
		['*********9093', true],
		['*********909', true],
		['******909', true],
		['*******93', true],
		['500**9093', true],
		['*****1909', false],
		['*******83', false],
		['732*****9', false],
	])('maska telefonu %s jest telefonem sklepu: %s', (mask, isShop) => {
		expect(
			isShopTrace({ id: '', kind: 'phone', ...parsePhoneMask(mask) }),
		).toBe(isShop);
	});

	it('ucięty telefon sklepu z etykiety nie daje tropu', () => {
		const reads = readsFromOcr(
			createOcrResponse([
				['rapid', 'tel. *********9093'],
				['tess-general', 'tel. ********909'],
			]),
		);

		expect(reads).toEqual([]);
	});

	it.each([
		['Ko***', true],
		['ko*** dr***', true],
		['KO*** AN***', false],
		['ZI*** GÓ***', false],
	])('maska imienia %s jest nazwą sklepu: %s', (mask, isShop) => {
		expect(
			isShopTrace({ id: '', kind: 'name', prefixes: parseNameMask(mask) }),
		).toBe(isShop);
	});

	it.each([
		'KozackaDrogeria.pl  Chemia gospodarcza',
		'DrogeriaKozacka',
		'KOZACKA DROGERIA sp. z o.o.',
		'ul. Kozacka-Drogeria',
		'K O Z A C K A',
		'PL-32432 Pcim',
	])('niezamaskowana nazwa sklepu: %s', (text) => {
		expect(isShopText(text)).toBe(true);
	});

	it.each([
		'620999667201234567890166',
		'6209 9966 7201 2345',
		'Pcimowski Jan',
		'Kozak Anna',
	])('krótkie znaczniki nie wycinają fragmentów innych słów: %s', (text) => {
		expect(isShopText(text)).toBe(false);
	});

	it('linia z nazwą sklepu i maską imienia nie daje tropu imienia', () => {
		const reads = readsFromOcr(
			createOcrResponse([
				['rapid', 'KozackaDrogeria.pl Ko*** Dr***'],
				['rapid', 'KOZACKA DROGERIA AN*** NO***'],
				['rapid', '620999667201234567890166'],
			]),
		);

		expect(reads.map((read) => read.kind)).toEqual(['package']);
	});

	it.each([
		'880729093',
		'880729083',
		'880729003',
		'1880729093',
		'1880729083',
		'18807290893',
		'o 880729093',
	])('telefon sklepu z pomyłką OCR %s nie daje tropu', (text) => {
		expect(readsFromOcr(createOcrResponse([['rapid', text]]))).toEqual([]);
	});

	it('telefon klienta różny od telefonu sklepu na dwóch pozycjach zostaje tropem', () => {
		expect(isShopPhone('880721193')).toBe(false);
	});

	it.each(['** ** **3 093', '*********9093'])(
		'zamaskowana końcówka telefonu sklepu %s nie daje tropu',
		(text) => {
			expect(readsFromOcr(createOcrResponse([['rapid', text]]))).toEqual([]);
		},
	);

	it('kod trasy DHL z kodem pocztowym sklepu nie jest tropem', () => {
		expect(readFromBarcode(LABEL_CODES.dhlRouting)).toBeNull();
		expect(
			readsFromOcr(createOcrResponse([['rapid', LABEL_CODES.dhlRouting]])),
		).toEqual([]);
	});

	it('kod pocztowy sklepu w pełnym kodzie DPD nie daje tropu kodu pocztowego', () => {
		const reads = readsFromOcr(
			createOcrResponse([['rapid', LABEL_CODES.dpdFull[0]]]),
		);

		expect(reads.map((read) => read.kind)).toEqual(['package']);
	});

	it.each([
		'Fi**',
		'Kr***',
		'Kr*** K.*** Ko*** Sp***',
		'Dro**',
		'Ko*** Dri** Ko*** Drr**',
	])('zamaskowana nazwa firmy odbiorcy %s nie jest tropem imienia', (text) => {
		expect(readsFromOcr(createOcrResponse([['rapid', text]]))).toEqual([]);
	});
});
