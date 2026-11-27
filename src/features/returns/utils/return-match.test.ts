import { describe, expect, it } from 'vitest';
import type { OrderDetailsPackage } from '@/features/returns/model/returns.types';
import { describeReturnMatch } from '@/features/returns/utils/return-match';

function buildPackage(
	overrides: Partial<OrderDetailsPackage> = {},
): OrderDetailsPackage {
	return {
		courierCode: 'inpost',
		packageNumber: '520000000000000000000001',
		innerNumber: '520000000000000000000001',
		isReturn: false,
		...overrides,
	};
}

describe('describeReturnMatch', () => {
	it('rozpoznaje przewoźnika i paczkę wysyłkową zamówienia', () => {
		expect(
			describeReturnMatch({
				matchedBy: 'auto',
				scannedLabel: '520000000000000000000001',
				packages: [buildPackage()],
			}),
		).toEqual({
			matchedBy: 'auto',
			scannedLabel: '520000000000000000000001',
			carrier: 'inpost',
			packageMatch: { kind: 'shipping' },
		});
	});

	it('oznacza paczkę zwrotną', () => {
		const result = describeReturnMatch({
			matchedBy: 'manual-pick',
			scannedLabel: '1055513876329u',
			packages: [
				buildPackage({
					packageNumber: '1055513876329U',
					innerNumber: 'RETURN1',
					isReturn: true,
				}),
			],
		});

		expect(result.carrier).toBe('dpd');
		expect(result.packageMatch).toEqual({ kind: 'return' });
	});

	it('dopasowuje numer paczki z pełnego kodu DPD', () => {
		const result = describeReturnMatch({
			matchedBy: 'auto',
			scannedLabel: '32432001055513876329U000001',
			packages: [buildPackage({ packageNumber: '1055513876329U' })],
		});

		expect(result.packageMatch).toEqual({ kind: 'shipping' });
	});

	it('dopasowuje numer z cyfrą dokleconą przez OCR i bierze przewoźnika z paczki', () => {
		const result = describeReturnMatch({
			matchedBy: 'auto',
			scannedLabel: '1521000012351126087471725',
			packages: [buildPackage({ packageNumber: '521000012351126087471725' })],
		});

		expect(result.carrier).toBe('inpost');
		expect(result.packageMatch).toEqual({ kind: 'shipping' });
	});

	it('dopasowuje numer krótszy o znak na końcu', () => {
		const result = describeReturnMatch({
			matchedBy: 'auto',
			scannedLabel: '52100001235112608747172',
			packages: [buildPackage({ packageNumber: '521000012351126087471725' })],
		});

		expect(result.carrier).toBe('inpost');
		expect(result.packageMatch).toEqual({ kind: 'shipping' });
	});

	it('nie dopasowuje przy nadmiarze ponad 2 znaki ani przy krótkim numerze', () => {
		const longPackage = buildPackage({
			packageNumber: '521000012351126087471725',
		});

		expect(
			describeReturnMatch({
				matchedBy: 'auto',
				scannedLabel: '123521000012351126087471725',
				packages: [longPackage],
			}).packageMatch,
		).toEqual({ kind: 'none' });
		expect(
			describeReturnMatch({
				matchedBy: 'auto',
				scannedLabel: '12345',
				packages: [buildPackage({ packageNumber: '1234567' })],
			}).packageMatch,
		).toEqual({ kind: 'none' });
	});

	it('nie dopasowuje obcego numeru ani brakującego numeru', () => {
		const packages = [buildPackage()];

		expect(
			describeReturnMatch({
				matchedBy: 'manual-entry',
				scannedLabel: '123',
				packages,
			}),
		).toMatchObject({ carrier: null, packageMatch: { kind: 'none' } });
		expect(
			describeReturnMatch({
				matchedBy: 'imported',
				scannedLabel: null,
				packages,
			}),
		).toEqual({
			matchedBy: 'imported',
			scannedLabel: null,
			carrier: null,
			packageMatch: { kind: 'none' },
		});
	});
});
