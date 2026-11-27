import { describe, expect, it } from 'vitest';
import { splitPackageNumber } from './package-suffix-highlight';

describe('splitPackageNumber', () => {
	it('oddziela wpisaną końcówkę od reszty numeru', () => {
		expect(splitPackageNumber('620999669102333991767', '1767')).toEqual({
			head: '62099966910233399',
			tail: '1767',
		});
	});

	it('zwraca cały numer jako początek, gdy końcówka nie pasuje', () => {
		expect(splitPackageNumber('A00ABC1234', '9999')).toEqual({
			head: 'A00ABC1234',
			tail: '',
		});
	});

	it('zwraca cały numer jako początek przy pustej końcówce', () => {
		expect(splitPackageNumber('A00ABC1234', '')).toEqual({
			head: 'A00ABC1234',
			tail: '',
		});
	});
});
