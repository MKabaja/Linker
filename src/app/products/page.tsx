import { ProductsPagination } from '@/features/products/components/products-pagination';
import { ProductsTable } from '@/features/products/components/products-table';
import { primaveraErrorMessageByCode } from '@/features/products/model/products.constants';
import { productsSearchParamsSchema } from '@/features/products/model/products.schemas';
import { getProductsPage } from '@/features/products/server/services/products.service';

export default async function ProductsPage(props: PageProps<'/products'>) {
	const { q, page } = productsSearchParamsSchema.parse(
		await props.searchParams,
	);
	const productsPage = await getProductsPage({ query: q, page });

	if (productsPage.status === 'error') {
		return (
			<p role="alert" className="text-danger">
				{primaveraErrorMessageByCode[productsPage.code]}
			</p>
		);
	}

	if (productsPage.totalCount === 0) {
		return <p className="text-dim">Brak produktów dla hasła „{q}”.</p>;
	}

	return (
		<>
			<ProductsTable status="ready" products={productsPage.products} />
			<ProductsPagination
				query={q}
				page={productsPage.page}
				pageCount={productsPage.pageCount}
				totalCount={productsPage.totalCount}
			/>
		</>
	);
}
