import {
	getPrimaveraProductsPage,
	ProductsPagination,
	ProductsTable,
	productsSearchParamsSchema,
} from '@/features/products';

export default async function ProductsPage(props: PageProps<'/products'>) {
	const { q, page } = productsSearchParamsSchema.parse(
		await props.searchParams,
	);
	const productsPage = await getPrimaveraProductsPage({ query: q, page });

	return (
		<section>
			<h1 className="mb-6 text-2xl font-bold">Produkty z Primavery</h1>
			{productsPage.status === 'error' ? (
				<p role="alert" className="text-danger">
					Nie udało się pobrać produktów: {productsPage.message}
				</p>
			) : productsPage.totalCount === 0 ? (
				<p className="text-dim">Brak produktów dla hasła „{q}”.</p>
			) : (
				<>
					<ProductsTable products={productsPage.products} />
					<ProductsPagination
						query={q}
						page={productsPage.page}
						pageCount={productsPage.pageCount}
						totalCount={productsPage.totalCount}
					/>
				</>
			)}
		</section>
	);
}
