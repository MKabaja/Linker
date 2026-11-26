import type {
	ScoredCandidate,
	ScoreResult,
} from '@/features/returns/model/order-scoring.types';

/** Zwrot już przyjęty dla zamówienia z wyników wyszukiwania. */
type ExistingReturn = {
	returnId: number;
	/** ISO 8601 w UTC. */
	receivedAt: string;
	/** Imię pracownika albo etykieta importu. */
	receivedByName: string;
};

type SearchCandidate = ScoredCandidate & {
	existingReturn: ExistingReturn | null;
};

/**
 * Odpowiedź `POST /api/returns/search`: `ScoreResult`, w którym każdy kandydat ma też `existingReturn`.
 */
type SearchResponse = Omit<ScoreResult, 'candidates'> & {
	candidates: SearchCandidate[];
};

export type { ExistingReturn, SearchCandidate, SearchResponse };
