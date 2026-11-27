import type {
	ExistingReturn,
	SearchCandidate,
} from '@/features/returns/model/order-search.types';

type ManualCandidateInput = {
	orderId: number;
	existingReturn: ExistingReturn | null;
};

/**
 * Zamienia zamówienie wybrane ręcznie (z listy po końcówce numeru albo z oczekujących zwrotów)
 * na kandydata zapisu zwrotu. Bez punktacji, więc `bits: 0` i brak powodów.
 */
function toManualCandidate({
	orderId,
	existingReturn,
}: ManualCandidateInput): SearchCandidate {
	return { orderId, bits: 0, reasons: [], existingReturn };
}

export { toManualCandidate };
