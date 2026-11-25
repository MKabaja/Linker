import {
	COST_LENGTH,
	COST_WINDOW,
	type CompiledPattern,
	codeCost,
	MIN_WINDOW_LENGTH,
} from '@/features/returns/utils/pattern-cost';

/**
 * Zwraca odległość edycyjną wzorca od wartości (zgubiona lub dodatkowa cyfra kosztuje `0.5`).
 * Odczyt może być też fragmentem wartości, z karą `0.3`. Wzorce krótsze niż 8 pozycji dają `Infinity`.
 */
export function matchEditCompiled(
	compiled: CompiledPattern,
	value: string,
	maxCost = Number.POSITIVE_INFINITY,
): number {
	if (compiled.codes.length < MIN_WINDOW_LENGTH) {
		return Number.POSITIVE_INFINITY;
	}
	const cost = Math.min(
		wholeEditCost(compiled, value, maxCost),
		fragmentEditCost(compiled, value, maxCost),
	);
	return cost <= maxCost ? cost : Number.POSITIVE_INFINITY;
}

function wholeEditCost(
	compiled: CompiledPattern,
	value: string,
	maxCost: number,
): number {
	const firstRow = new Float64Array(value.length + 1).map(
		(_, index) => index * COST_LENGTH,
	);
	const lastRow = editLastRow(compiled, value, firstRow, maxCost);
	return lastRow ? lastRow[value.length] : Number.POSITIVE_INFINITY;
}

function fragmentEditCost(
	compiled: CompiledPattern,
	value: string,
	maxCost: number,
): number {
	const firstRow = new Float64Array(value.length + 1);
	const lastRow = editLastRow(compiled, value, firstRow, maxCost);
	return lastRow
		? Math.min(...lastRow) + COST_WINDOW
		: Number.POSITIVE_INFINITY;
}

function editLastRow(
	compiled: CompiledPattern,
	value: string,
	firstRow: Float64Array,
	maxCost: number,
): Float64Array | null {
	let previous: Float64Array = firstRow;
	let current: Float64Array = new Float64Array(value.length + 1);
	for (let row = 1; row <= compiled.codes.length; row++) {
		current[0] = row * COST_LENGTH;
		let rowMin = current[0];
		for (let column = 1; column <= value.length; column++) {
			const substitute =
				previous[column - 1] +
				codeCost(compiled, row - 1, value.charCodeAt(column - 1));
			current[column] = Math.min(
				substitute,
				previous[column] + COST_LENGTH,
				current[column - 1] + COST_LENGTH,
			);
			rowMin = Math.min(rowMin, current[column]);
		}
		if (rowMin > maxCost) {
			return null;
		}
		const swap = previous;
		previous = current;
		current = swap;
	}
	return previous;
}
