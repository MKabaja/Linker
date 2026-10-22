import { PRODUCTS_PAGE_SIZE } from '@/features/products/model/products.constants';
import type {
	PrimaveraProductsPageQuery,
	PrimaveraProductsPageResult,
} from '@/features/products/model/products.types';
import { getPrimaveraProducts } from '@/features/products/server/repositories/products.repository';
import { paginateProducts } from './paginate-products';
import { searchPrimaveraProducts } from './search-primavera-products';

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

	return {
		status: 'ok',
		fetchedAt: productsResult.fetchedAt,
		...paginateProducts(matchingProducts, {
			page,
			pageSize: PRODUCTS_PAGE_SIZE,
		}),
	};
}
