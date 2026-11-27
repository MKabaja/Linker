import { PageContent } from '@/shared/components/page-content';
import { Skeleton } from '@/shared/components/skeleton';

export default function ReturnLoading() {
	return (
		<PageContent aria-busy="true" className="w-full">
			<Skeleton className="h-8 w-72" />
			<Skeleton className="h-20 w-full" />
			<Skeleton className="h-14 w-full" />
			<Skeleton className="h-24 w-full" />
			<Skeleton className="h-48 w-full" />
		</PageContent>
	);
}
