import 'server-only';
import { PRODUCTS_PAGE_SIZE } from '@/features/products/model/products.constants';
import type {
	PrimaveraProduct,
	PrimaveraProductsPageQuery,
	PrimaveraProductsPageResult,
} from '@/features/products/model/products.types';
import { getPrimaveraProducts } from '@/features/products/server/repositories/products.repository';
import { normalizeSearchText } from '@/features/products/utils/normalize-search-text';
import { paginate } from '@/shared/lib/paginate';

type ProductMatcher = (product: PrimaveraProduct) => boolean;

/**
 * Zwraca jedną stronę produktów z Primavery pasujących do hasła, razem
 * z łączną liczbą wyników, liczbą stron i godziną pobrania danych. Numer
 * strony spoza zakresu jest przycinany do ostatniej strony. Błąd pobrania
 * wraca jako wynik ze statusem `error`.
 */
export async function getPrimaveraProductsPage({
	query,
	page,
}: PrimaveraProductsPageQuery): Promise<PrimaveraProductsPageResult> {
	const productsResult = await getPrimaveraProducts();

	if (productsResult.status === 'error') {
		return productsResult;
	}

	const matchingProducts = searchPrimaveraProducts(
		productsResult.products,
		query,
	);

	const { items, ...pagination } = paginate(matchingProducts, {
		page,
		pageSize: PRODUCTS_PAGE_SIZE,
	});

	return {
		status: 'ok',
		fetchedAt: productsResult.fetchedAt,
		products: items,
		...pagination,
	};
}

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
