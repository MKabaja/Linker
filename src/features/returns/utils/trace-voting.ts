import type { Pattern } from '@/features/returns/model/traces.types';
import { slotCost } from '@/features/returns/utils/pattern-cost';

const MIN_MERGE_COST = 1.3;
const MERGE_COST_PER_SLOT = 0.12;
const TIE_EPSILON = 1e-9;

type WeightedPattern = { pattern: Pattern; weight: number };

/**
 * Sprawdza, czy dwa odczyty to ten sam numer: ta sama długość i koszt różnic
 * poniżej limitu rosnącego z długością (dziury się nie liczą).
 */
function isSameNumberRead(left: Pattern, right: Pattern): boolean {
	if (left.length !== right.length) {
		return false;
	}
	const maxCost = Math.max(MIN_MERGE_COST, right.length * MERGE_COST_PER_SLOT);
	let cost = 0;
	for (let index = 0; index < left.length; index++) {
		cost += slotDistance(left[index], right[index]);
		if (cost > maxCost) {
			return false;
		}
	}
	return true;
}

/**
 * Zwraca wzorzec większościowy liczony pozycja po pozycji z wagami odczytów.
 * Remis daje alternatywy (np. `"56"`), brak głosów daje dziurę.
 */
function votePattern(reads: WeightedPattern[], length: number): Pattern {
	return Array.from({ length }, (_, index) => voteSlot(reads, index));
}

function slotDistance(left: string, right: string): number {
	if (!left || !right) {
		return 0;
	}
	let best = Number.POSITIVE_INFINITY;
	for (const char of right) {
		best = Math.min(best, slotCost(left, char));
	}
	return best;
}

function voteSlot(reads: WeightedPattern[], index: number): string {
	const votesByChar = new Map<string, number>();
	for (const { pattern, weight } of reads) {
		const slot = pattern[index];
		for (const char of slot) {
			votesByChar.set(
				char,
				(votesByChar.get(char) ?? 0) + weight / slot.length,
			);
		}
	}
	const maxVotes = Math.max(0, ...votesByChar.values());
	return [...votesByChar]
		.filter(([, votes]) => votes > 0 && maxVotes - votes < TIE_EPSILON)
		.map(([char]) => char)
		.sort()
		.join('');
}

export { isSameNumberRead, votePattern, type WeightedPattern };
