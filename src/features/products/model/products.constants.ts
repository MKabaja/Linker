import type { PrimaveraErrorCode } from './products.types';

type PrimaveraErrorMessageByCode = Record<PrimaveraErrorCode, string>;

const PRODUCTS_PAGE_SIZE = 50;
const PRODUCTS_SEARCH_MAX_LENGTH = 100;

const primaveraErrorMessageByCode: PrimaveraErrorMessageByCode = {
	MISSING_TOKEN: 'Brak tokenu Primavery. Ustaw PRIMAVERA_TOKEN w .env.local.',
	UNAUTHORIZED: 'Primavera odrzuciła token. Sprawdź PRIMAVERA_TOKEN.',
	UNAVAILABLE: 'Primavera nie odpowiada. Spróbuj ponownie za chwilę.',
	EMPTY_RESPONSE: 'Primavera zwróciła pusty cennik.',
	INVALID_FORMAT: 'Cennik z Primavery ma nieoczekiwany format.',
	UNKNOWN: 'Nie udało się pobrać produktów z Primavery.',
};

export {
	PRODUCTS_PAGE_SIZE,
	PRODUCTS_SEARCH_MAX_LENGTH,
	primaveraErrorMessageByCode,
};
