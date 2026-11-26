import type { IndexedOrder } from '@/features/returns/model/order-scoring.types';
import type { Pattern } from '@/features/returns/model/traces.types';
import {
	COST_CONFUSION,
	slotCost,
} from '@/features/returns/utils/pattern-cost';

const PROFILED_LENGTH = 24;
const PROFILE_HEAD_LENGTH = 6;
const PROFILE_MIN_COUNT = 30;
const MIN_DIGIT_SHARE = 0.02;
const MAX_STRUCTURAL_DIGITS = 2;
const DIGITS = '0123456789';

/**
 * Profil pozycji 24-cyfrowych numerów o wspólnym początku: cyfry spotykane na każdej pozycji
 * (od 2% numerów) i czy pozycja jest strukturalna (najwyżej 2 takie cyfry, więc nie odróżnia numerów).
 */
type PackageProfile = { allowedDigits: string[]; isStructural: boolean[] };

type PackageProfileByHead = Map<string, PackageProfile>;

type DigitCounts = { total: number; counts: Uint32Array };

/**
 * Buduje profile pozycji dla każdego 6-cyfrowego początku z co najmniej 30 numerami 24-cyfrowymi w indeksie.
 */
function collectPackageProfiles(orders: IndexedOrder[]): PackageProfileByHead {
	const countsByHead = new Map<string, DigitCounts>();
	for (const order of orders) {
		for (const packageNumber of order.packageNumbers) {
			if (!isProfiledNumber(packageNumber)) {
				continue;
			}
			countDigits(countsByHead, packageNumber);
		}
	}
	const profiles: PackageProfileByHead = new Map();
	for (const [head, digitCounts] of countsByHead) {
		if (digitCounts.total >= PROFILE_MIN_COUNT) {
			profiles.set(head, toProfile(digitCounts));
		}
	}
	return profiles;
}

/**
 * Zwraca profil dla numeru albo wzorca o długości 24 ze znanym 6-cyfrowym początkiem; inaczej `undefined`.
 */
function findPackageProfile(
	profiles: PackageProfileByHead,
	value: string | Pattern,
): PackageProfile | undefined {
	if (value.length !== PROFILED_LENGTH) {
		return undefined;
	}
	const head = [...value].slice(0, PROFILE_HEAD_LENGTH);
	return head.every((slot) => slot.length === 1)
		? profiles.get(head.join(''))
		: undefined;
}

/**
 * Przyciąga cyfry spoza profilu na pozycjach strukturalnych do cyfr profilu: do tych, z którymi to typowa
 * pomyłka OCR, a gdy takich nie ma, do wszystkich (alternatywy). Bez profilu zwraca ten sam wzorzec.
 */
function snapToProfile(
	pattern: Pattern,
	profiles: PackageProfileByHead,
): Pattern {
	const profile = findPackageProfile(profiles, pattern);
	if (!profile) {
		return pattern;
	}
	return pattern.map((slot, index) =>
		profile.isStructural[index] &&
		slot.length === 1 &&
		!profile.allowedDigits[index].includes(slot)
			? nearestAllowed(slot, profile.allowedDigits[index])
			: slot,
	);
}

/**
 * Zwraca koszt różnic wzorca i numeru tej samej długości tylko na pozycjach informacyjnych profilu.
 */
function informationalCost(
	pattern: Pattern,
	value: string,
	profile: PackageProfile,
): number {
	let cost = 0;
	for (let index = 0; index < value.length; index++) {
		if (!profile.isStructural[index]) {
			cost += slotCost(pattern[index], value[index]);
		}
	}
	return cost;
}

function isProfiledNumber(packageNumber: string): boolean {
	return (
		packageNumber.length === PROFILED_LENGTH && /^\d+$/.test(packageNumber)
	);
}

function countDigits(
	countsByHead: Map<string, DigitCounts>,
	packageNumber: string,
): void {
	const head = packageNumber.slice(0, PROFILE_HEAD_LENGTH);
	let digitCounts = countsByHead.get(head);
	if (!digitCounts) {
		digitCounts = {
			total: 0,
			counts: new Uint32Array(PROFILED_LENGTH * DIGITS.length),
		};
		countsByHead.set(head, digitCounts);
	}
	digitCounts.total++;
	for (let index = 0; index < PROFILED_LENGTH; index++) {
		const digit = packageNumber.charCodeAt(index) - 48;
		digitCounts.counts[index * DIGITS.length + digit]++;
	}
}

function toProfile({ total, counts }: DigitCounts): PackageProfile {
	const minCount = total * MIN_DIGIT_SHARE;
	const allowedDigits = Array.from({ length: PROFILED_LENGTH }, (_, index) =>
		[...DIGITS]
			.filter((_, digit) => counts[index * DIGITS.length + digit] >= minCount)
			.join(''),
	);
	return {
		allowedDigits,
		isStructural: allowedDigits.map(
			(digits) => digits.length <= MAX_STRUCTURAL_DIGITS,
		),
	};
}

function nearestAllowed(slot: string, allowedDigits: string): string {
	const confusable = [...allowedDigits].filter(
		(digit) => slotCost(slot, digit) <= COST_CONFUSION,
	);
	return confusable.length > 0 ? confusable.join('') : allowedDigits;
}

export {
	collectPackageProfiles,
	findPackageProfile,
	informationalCost,
	type PackageProfile,
	type PackageProfileByHead,
	snapToProfile,
};
