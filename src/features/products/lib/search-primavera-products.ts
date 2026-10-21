import type { PrimaveraProduct } from '../products.types';
import { normalizeSearchText } from './normalize-search-text';

type ProductMatcher = (product: PrimaveraProduct) => boolean;

/**
 * Filtruje produkty po haśle. Puste hasło zwraca wszystkie produkty. Hasło
 * złożone z samych cyfr jest traktowane jako EAN i musi zgadzać się dokładnie.
 * Pozostałe hasła są normalizowane jak nazwy produktów, a produkt pasuje, gdy
 * jego nazwa zawiera każde wpisane słowo.
 */
export function searchPrimaveraProducts(
	products: PrimaveraProduct[],
	query: string,
): PrimaveraProduct[] {
	const trimmedQuery = query.trim();

	if (trimmedQuery === '') {
		return products;
	}

	return products.filter(createProductMatcher(trimmedQuery));
}

function createProductMatcher(query: string): ProductMatcher {
	if (isEanQuery(query)) {
		return (product) => product.ean === query;
	}

	const searchWords = normalizeSearchText(query).split(' ');
	return (product) =>
		searchWords.every((word) => product.searchableName.includes(word));
}

function isEanQuery(query: string): boolean {
	return /^\d+$/.test(query);
}
