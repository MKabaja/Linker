import { PageContent } from '@/shared/components/page-content';
import { Skeleton } from '@/shared/components/skeleton';

export default function ReturnLoading() {
	return (
		<PageContent aria-busy="true" className="w-full">
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-12 w-72" />
			<div className="flex flex-col gap-6 lg:grid lg:grid-cols-[3fr_2fr] lg:items-start">
				<Skeleton className="h-96 w-full" />
				<Skeleton className="h-48 w-full" />
			</div>
		</PageContent>
	);
}
