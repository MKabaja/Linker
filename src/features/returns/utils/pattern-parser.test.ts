import { describe, expect, it } from 'vitest';
import {
	parseNameMask,
	parseNumberRead,
	parsePhoneMask,
	patternToString,
} from '@/features/returns/utils/pattern-parser';

describe('parseNumberRead', () => {
	it('skleja grupy i zamienia znaki podobne do cyfr', () => {
		expect(patternToString(parseNumberRead('62O9 99l6 |234'))).toBe(
			'620999161234',
		);
	});

	it('niepewne znaki to dziury, litery w numerach alfanumerycznych zostają', () => {
		expect(patternToString(parseNumberRead('1234?678'))).toBe('1234_678');
		expect(patternToString(parseNumberRead('px123456789pl'))).toBe(
			'PX123456789PL',
		);
	});
});

describe('parsePhoneMask', () => {
	it('9 pozycji → wzorzec pozycyjny, +48 obcięte', () => {
		expect(patternToString(parsePhoneMask('+48 7320***83').pattern ?? [])).toBe(
			'7320___83',
		);
	});

	it('inna liczba gwiazdek → początek i koniec', () => {
		expect(parsePhoneMask('732******3')).toEqual({
			pattern: null,
			anchored: { prefix: '732', suffix: '3' },
		});
	});
});

describe('parseNameMask', () => {
	it('prefiksy słów bez polskich znaków', () => {
		expect(parseNameMask('M*** Ka***')).toEqual(['m', 'ka']);
		expect(parseNameMask('Ł** Śl****')).toEqual(['l', 'sl']);
	});
});
