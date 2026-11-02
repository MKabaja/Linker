import 'server-only';
import { PRODUCTS_PAGE_SIZE } from '@/features/products/model/products.constants';
import type {
	PrimaveraProduct,
	PrimaveraProductsPageQuery,
	PrimaveraProductsPageResult,
} from '@/features/products/model/products.types';
import { findAllProducts } from '@/features/products/server/repositories/products.repository';
import { normalizeSearchText } from '@/features/products/utils/normalize-search-text';
import { paginate } from '@/shared/lib/paginate';

type ProductMatcher = (product: PrimaveraProduct) => boolean;

/**
 * Zwraca stronę produktów pasujących do hasła.
 *
 * Nie rzuca: błąd pobrania wraca jako `status: 'error'` z kodem.
 */
export async function getProductsPage({
	query,
	page,
}: PrimaveraProductsPageQuery): Promise<PrimaveraProductsPageResult> {
	const productsResult = await findAllProducts();

	if (productsResult.status === 'error') {
		return productsResult;
	}

	const matchingProducts = searchProducts(productsResult.products, query);

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
 * Filtruje produkty po haśle.
 *
 * - puste hasło zwraca wszystkie produkty,
 * - same cyfry szukają fragmentu EAN-u,
 * - tekst wymaga każdego słowa w nazwie, bez względu na wielkość liter i polskie znaki.
 */
export function searchProducts(
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
		return (product) => product.ean.includes(query);
	}

	const searchWords = normalizeSearchText(query).split(' ');
	return (product) =>
		searchWords.every((word) => product.searchableName.includes(word));
}

function isEanQuery(query: string): boolean {
	return /^\d+$/.test(query);
}
