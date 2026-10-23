import { Suspense } from 'react';
import { ProductsSearch } from '@/features/products/components/products-search';
import { Skeleton } from '@/shared/components/skeleton';

export default function ProductsLayout({ children }: LayoutProps<'/products'>) {
	return (
		<section className="group">
			<h1 className="mb-6 text-2xl font-bold">Produkty z Primavery</h1>
			<Suspense fallback={<Skeleton className="mb-4 h-9 max-w-md" />}>
				<ProductsSearch />
			</Suspense>
			<div className="transition-opacity group-has-data-pending:opacity-60">
				{children}
			</div>
		</section>
	);
}
