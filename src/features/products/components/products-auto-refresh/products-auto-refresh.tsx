'use client';
import { useRouter } from 'next/navigation';
import { useOnPageVisible } from '@/shared/hooks/use-on-page-visible';

export function ProductsAutoRefresh() {
	const router = useRouter();
	useOnPageVisible(() => {
		router.refresh();
	});
	return null;
}
