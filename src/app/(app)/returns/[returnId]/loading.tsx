import { Skeleton } from '@/shared/components/skeleton';

export default function ReturnLoading() {
	return (
		<section
			aria-busy="true"
			className="mx-auto flex w-full max-w-4xl flex-col gap-6 pt-4"
		>
			<Skeleton className="h-8 w-72" />
			<Skeleton className="h-20 w-full" />
			<Skeleton className="h-14 w-full" />
			<Skeleton className="h-24 w-full" />
			<Skeleton className="h-48 w-full" />
		</section>
	);
}
