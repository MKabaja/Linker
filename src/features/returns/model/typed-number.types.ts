import type { ExistingReturn } from '@/features/returns/model/order-search.types';

/** Zamówienie podpowiedziane po wpisanej końcówce numeru paczki albo kodzie zwrotu. */
type TypedNumberCandidate = {
	orderId: number;
	/** Pełny, znormalizowany numer paczki; `null` dla kandydata z kodu zwrotu. */
	packageNumber: string | null;
	/** Kod zwrotu (`NZ5J/2026`); `null` dla kandydata z numeru paczki. */
	returnReference: string | null;
	/** Imię i nazwisko z indeksu (bez polskich znaków) albo `''`. */
	customerName: string;
	/** ISO 8601 w UTC. */
	orderedAt: string;
	existingReturn: ExistingReturn | null;
};

type TypedNumberSearchResult =
	| { status: 'ok'; candidates: TypedNumberCandidate[] }
	| { status: 'invalid' };

type PendingReturnProductView = { name: string; quantity: number };

/** Zwrot z modułu zwrotów BaseLinkera, który czeka na przyjęcie. */
type PendingReturnView = {
	returnId: number;
	orderId: number;
	referenceNumber: string;
	/** Znormalizowany numer paczki albo `''`. */
	packageNumber: string;
	customerName: string;
	/** Kod pocztowy `00-000` albo `''`. */
	postcode: string;
	/** ISO 8601 w UTC. */
	addedAt: string;
	products: PendingReturnProductView[];
};

export type {
	PendingReturnProductView,
	PendingReturnView,
	TypedNumberCandidate,
	TypedNumberSearchResult,
};
