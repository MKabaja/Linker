import type {
	Pattern,
	PatternSlot,
} from '@/features/returns/model/traces.types';

const COST_ALTERNATIVE = 0.1;
const COST_CONFUSION = 0.3;
const COST_OTHER = 1;
const COST_LENGTH = 0.5;
const COST_WINDOW = 0.3;
const MIN_WINDOW_LENGTH = 8;

const OCR_CONFUSIONS: readonly (readonly [string, string])[] = [
	['5', '6'],
	['3', '8'],
	['1', '7'],
	['0', '8'],
	['6', '8'],
	['2', '7'],
	['0', 'O'],
	['1', 'I'],
	['8', 'B'],
	['5', 'S'],
	['2', 'Z'],
];

const ASCII_SIZE = 128;
const HOLE_CODE = -1;
const ALTERNATIVES_CODE = -2;

const confusionTable = buildConfusionTable();

/**
 * Wzorzec przygotowany do szybkiego porównania: kod znaku na pozycję (`-1` dziura, `-2` alternatywy).
 */
type CompiledPattern = { codes: Int32Array; slots: Pattern };

/**
 * Kompiluje wzorzec. Wołaj raz na trop, a wynik porównuj z tysiącami wartości.
 */
function compilePattern(pattern: Pattern): CompiledPattern {
	const codes = new Int32Array(pattern.length);
	pattern.forEach((slot, index) => {
		codes[index] = toSlotCode(slot);
	});
	return { codes, slots: pattern };
}

/**
 * Zwraca koszt jednej pozycji: zgodny znak lub dziura `0`, alternatywa `0.1`,
 * typowa pomyłka OCR `0.3`, inna różnica `1`.
 */
function slotCost(slot: PatternSlot, char: string): number {
	if (slot.length === 0) {
		return 0;
	}
	if (slot.length === 1) {
		if (slot === char) {
			return 0;
		}
		return isConfusion(slot.charCodeAt(0), char.charCodeAt(0))
			? COST_CONFUSION
			: COST_OTHER;
	}
	if (slot.includes(char)) {
		return COST_ALTERNATIVE;
	}
	for (const option of slot) {
		if (isConfusion(option.charCodeAt(0), char.charCodeAt(0))) {
			return COST_CONFUSION;
		}
	}
	return COST_OTHER;
}

/**
 * Zwraca koszt dopasowania wzorca do wartości tej samej długości albo różnej o 1
 * (najlepsze miejsce pominięcia znaku plus kara). Większa różnica długości
 * i koszt powyżej `maxCost` dają `Infinity`.
 */
function matchCompiled(
	compiled: CompiledPattern,
	value: string,
	maxCost = Number.POSITIVE_INFINITY,
): number {
	const lengthDifference = compiled.codes.length - value.length;
	if (lengthDifference === 0) {
		return alignedCost(compiled, value, 0, maxCost);
	}
	if (Math.abs(lengthDifference) !== 1) {
		return Number.POSITIVE_INFINITY;
	}
	const cost = indelCost(compiled, value);
	return cost <= maxCost ? cost : Number.POSITIVE_INFINITY;
}

function matchCost(
	pattern: Pattern,
	value: string,
	maxCost = Number.POSITIVE_INFINITY,
): number {
	return matchCompiled(compilePattern(pattern), value, maxCost);
}

/**
 * Działa jak {@link matchCompiled}, ale dopuszcza też numer zawarty w odczycie
 * (albo odczyt będący fragmentem numeru, min. 8 znaków) z karą `0.3`.
 */
function matchPackageCompiled(
	compiled: CompiledPattern,
	value: string,
	maxCost = Number.POSITIVE_INFINITY,
): number {
	const lengthDifference = compiled.codes.length - value.length;
	if (Math.abs(lengthDifference) <= 1) {
		return matchCompiled(compiled, value, maxCost);
	}
	const overlapLength = Math.min(compiled.codes.length, value.length);
	const budget = maxCost - COST_WINDOW;
	if (overlapLength < MIN_WINDOW_LENGTH || budget < 0) {
		return Number.POSITIVE_INFINITY;
	}
	const direction = lengthDifference > 0 ? -1 : 1;
	let best = Number.POSITIVE_INFINITY;
	for (let offset = 0; offset <= Math.abs(lengthDifference); offset++) {
		const cost = alignedCost(
			compiled,
			value,
			offset * direction,
			Math.min(budget, best),
		);
		best = Math.min(best, cost);
		if (best === 0) {
			break;
		}
	}
	return best + COST_WINDOW;
}

function matchPackage(
	pattern: Pattern,
	value: string,
	maxCost = Number.POSITIVE_INFINITY,
): number {
	return matchPackageCompiled(compilePattern(pattern), value, maxCost);
}

/**
 * Zwraca koszt wzorca przyłożonego do wartości z przesunięciem `shift`
 * (pozycja `i` wzorca porównywana ze znakiem `i + shift` wartości), tylko na części wspólnej.
 * Powyżej `maxCost` przerywa liczenie i zwraca `Infinity`.
 */
function alignedCost(
	compiled: CompiledPattern,
	value: string,
	shift: number,
	maxCost: number,
): number {
	const from = Math.max(0, -shift);
	const to = Math.min(compiled.codes.length, value.length - shift);
	let cost = 0;
	for (let index = from; index < to; index++) {
		cost += codeCost(compiled, index, value.charCodeAt(index + shift));
		if (cost > maxCost) {
			return Number.POSITIVE_INFINITY;
		}
	}
	return cost;
}

/**
 * Zwraca liczbę pozycji, na których wartość różni się od wzorca, albo `-1` przy innej długości.
 */
function countDiffs(pattern: Pattern, value: string): number {
	if (pattern.length !== value.length) {
		return -1;
	}
	let diffs = 0;
	for (let index = 0; index < value.length; index++) {
		if (slotCost(pattern[index], value[index]) >= COST_CONFUSION) {
			diffs++;
		}
	}
	return diffs;
}

function buildConfusionTable(): Uint8Array {
	const table = new Uint8Array(ASCII_SIZE * ASCII_SIZE);
	for (const [left, right] of OCR_CONFUSIONS) {
		table[left.charCodeAt(0) * ASCII_SIZE + right.charCodeAt(0)] = 1;
		table[right.charCodeAt(0) * ASCII_SIZE + left.charCodeAt(0)] = 1;
	}
	return table;
}

function isConfusion(leftCode: number, rightCode: number): boolean {
	return (
		leftCode < ASCII_SIZE &&
		rightCode < ASCII_SIZE &&
		confusionTable[leftCode * ASCII_SIZE + rightCode] === 1
	);
}

function toSlotCode(slot: PatternSlot): number {
	if (slot.length === 0) {
		return HOLE_CODE;
	}
	return slot.length === 1 ? slot.charCodeAt(0) : ALTERNATIVES_CODE;
}

function codeCost(
	compiled: CompiledPattern,
	index: number,
	charCode: number,
): number {
	const code = compiled.codes[index];
	if (code === charCode || code === HOLE_CODE) {
		return 0;
	}
	if (code >= 0) {
		return isConfusion(code, charCode) ? COST_CONFUSION : COST_OTHER;
	}
	return slotCost(compiled.slots[index], String.fromCharCode(charCode));
}

function indelCost(compiled: CompiledPattern, value: string): number {
	const isPatternLonger = compiled.codes.length > value.length;
	const shortLength = Math.min(compiled.codes.length, value.length);
	const suffixCost = new Float64Array(shortLength + 1);
	for (let index = shortLength - 1; index >= 0; index--) {
		const skippedCost = isPatternLonger
			? codeCost(compiled, index + 1, value.charCodeAt(index))
			: codeCost(compiled, index, value.charCodeAt(index + 1));
		suffixCost[index] = suffixCost[index + 1] + skippedCost;
	}
	let prefixCost = 0;
	let best = suffixCost[0];
	for (let index = 0; index < shortLength; index++) {
		prefixCost += codeCost(compiled, index, value.charCodeAt(index));
		best = Math.min(best, prefixCost + suffixCost[index + 1]);
	}
	return best + COST_LENGTH;
}

export {
	alignedCost,
	COST_CONFUSION,
	COST_LENGTH,
	COST_WINDOW,
	type CompiledPattern,
	codeCost,
	compilePattern,
	countDiffs,
	MIN_WINDOW_LENGTH,
	matchCompiled,
	matchCost,
	matchPackage,
	matchPackageCompiled,
	slotCost,
};
