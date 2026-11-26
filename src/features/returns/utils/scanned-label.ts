import type { ScoredCandidate } from '@/features/returns/model/order-scoring.types';
import type { TraceEntry } from '@/features/returns/model/traces.types';
import { normalizeCode } from '@/features/returns/utils/normalize-text';

type ScannedLabelInput = {
	entries: TraceEntry[];
	candidate: ScoredCandidate;
};

/**
 * Wybiera numer paczki lub etykiety, który dał trafienie, do zapisania przy zwrocie.
 * Bierze tylko tropy numeru paczki z pełnym, jednoznacznym wzorcem (bez dziur i alternatyw),
 * bo przybliżony numer nie wskazywałby paczki. Tropy ze stanem `hit` mają pierwszeństwo,
 * w obrębie stanu wygrywa ten, który dał więcej bitów. Zwraca `undefined`, gdy nic się nie nadaje.
 */
function pickScannedLabel({
	entries,
	candidate,
}: ScannedLabelInput): string | undefined {
	const labels = candidate.reasons
		.filter((reason) => reason.kind === 'package')
		.toSorted((left, right) => right.bits - left.bits)
		.flatMap((reason) => {
			const entry = entries.find(
				(item) => item.id === reason.traceId.split('@')[0],
			);
			const label = entry ? readExactLabel(entry) : undefined;
			return entry && label ? [{ label, isHit: entry.state === 'hit' }] : [];
		});

	return (labels.find(({ isHit }) => isHit) ?? labels[0])?.label;
}

function readExactLabel({ query }: TraceEntry): string | undefined {
	if (query.kind !== 'package') {
		return undefined;
	}
	const isExact = query.pattern.every((slot) => slot.length === 1);
	return isExact ? normalizeCode(query.pattern.join('')) : undefined;
}

export { pickScannedLabel };
