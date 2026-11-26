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
	/** ISO 8601 w UTC; ustawione, gdy zwrot usunięto. */
	deletedAt?: string | null;
	deletedByName?: string | null;
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
