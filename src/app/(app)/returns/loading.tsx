import { ReturnsDayTableSkeleton } from '@/features/returns/components/returns-day-table';
import { PageContent } from '@/shared/components/page-content';
import { PageHeader } from '@/shared/components/page-header';
import { Skeleton } from '@/shared/components/skeleton';

export default function ReturnsLoading() {
	return (
		<section>
			<PageHeader title="Zwroty" />
			<Skeleton className="h-24 w-full rounded-none" />
			<PageContent>
				<ReturnsDayTableSkeleton />
			</PageContent>
		</section>
	);
}
