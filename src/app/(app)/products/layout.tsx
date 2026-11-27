import { Suspense } from 'react';
import { ProductsAutoRefresh } from '@/features/products/components/products-auto-refresh';
import { ProductsSearch } from '@/features/products/components/products-search';
import { PageContent } from '@/shared/components/page-content';
import { PageHeader } from '@/shared/components/page-header';
import { Skeleton } from '@/shared/components/skeleton';

export default function ProductsLayout({ children }: LayoutProps<'/products'>) {
	return (
		<section className="group">
			<ProductsAutoRefresh />
			<PageHeader
				title="Produkty z Primavery"
				actions={
					<Suspense fallback={<Skeleton className="h-9 w-72" />}>
						<ProductsSearch />
					</Suspense>
				}
			/>
			<PageContent className="transition-opacity group-has-data-pending:opacity-60">
				{children}
			</PageContent>
		</section>
	);
}
