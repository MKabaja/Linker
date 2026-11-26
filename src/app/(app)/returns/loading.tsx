import { ReturnsDayTableSkeleton } from '@/features/returns/components/returns-day-table';
import { Skeleton } from '@/shared/components/skeleton';

export default function ReturnsLoading() {
	return (
		<section className="flex flex-col gap-6 pt-4">
			<h1 className="text-2xl font-bold">Zwroty</h1>
			<Skeleton className="h-11 w-full" />
			<Skeleton className="h-24 w-full" />
			<ReturnsDayTableSkeleton />
		</section>
	);
}
