import { describe, expect, it } from 'vitest';
import {
	createRandom,
	makeOrder,
} from '@/features/returns/utils/fixtures.test-helper';
import {
	collectPackageProfiles,
	findPackageProfile,
	informationalCost,
	snapToProfile,
} from '@/features/returns/utils/package-profile';
import { patternToString } from '@/features/returns/utils/pattern-parser';

const STRUCTURAL_POSITION = 15;

function inpostLikeNumber(random: () => number): string {
	const digits = Array.from({ length: 17 }, () => Math.floor(random() * 10));
	digits[STRUCTURAL_POSITION - 7] = random() < 0.6 ? 6 : 4;
	return `6209996${digits.join('')}`;
}

const random = createRandom(3);
const orders = Array.from({ length: 200 }, (_, index) =>
	makeOrder({ orderId: index + 1, packageNumbers: [inpostLikeNumber(random)] }),
);
const profiles = collectPackageProfiles(orders);
const sample = orders[0].packageNumbers[0];

function withDigitAt(position: number, digit: string): string[] {
	return [...sample.slice(0, position), digit, ...sample.slice(position + 1)];
}

describe('profil pozycji numerów 24-cyfrowych', () => {
	it('początek i pozycja z dwiema cyframi są strukturalne, ogon informacyjny', () => {
		const profile = findPackageProfile(profiles, sample);

		expect(profile?.isStructural.slice(0, 7).every(Boolean)).toBe(true);
		expect(profile?.allowedDigits[STRUCTURAL_POSITION]).toBe('46');
		expect(profile?.isStructural[STRUCTURAL_POSITION]).toBe(true);
		expect(profile?.isStructural[23]).toBe(false);
	});

	it('początek z mniej niż 30 numerami nie ma profilu', () => {
		expect(
			findPackageProfile(profiles, `5209996${sample.slice(7)}`),
		).toBeUndefined();
	});

	it.each([
		['5', '6'],
		['8', '6'],
		['1', '46'],
	])(
		'cyfra %s na pozycji strukturalnej przyciąga się do %s',
		(read, snapped) => {
			const snappedPattern = snapToProfile(
				withDigitAt(STRUCTURAL_POSITION, read),
				profiles,
			);

			expect(snappedPattern[STRUCTURAL_POSITION]).toBe(snapped);
		},
	);

	it('cyfry na pozycjach informacyjnych i numery bez profilu zostają bez zmian', () => {
		const pattern = withDigitAt(23, sample[23] === '5' ? '6' : '5');
		const foreign = [...`5209996${sample.slice(7)}`];

		expect(snapToProfile(pattern, profiles)).toEqual(pattern);
		expect(patternToString(snapToProfile(foreign, profiles))).toBe(
			foreign.join(''),
		);
	});

	it('koszt informacyjny pomija różnice na pozycjach strukturalnych', () => {
		const profile = findPackageProfile(profiles, sample);
		const read = withDigitAt(0, '5');
		read[STRUCTURAL_POSITION] = sample[STRUCTURAL_POSITION] === '6' ? '4' : '6';

		expect(profile && informationalCost(read, sample, profile)).toBe(0);
	});
});
