import Link from 'next/link';
import { buttonVariants } from '@/shared/components/button';
import { PageContent } from '@/shared/components/page-content';
import { PageHeader } from '@/shared/components/page-header';

export default function ReturnNotFound() {
	return (
		<section>
			<PageHeader title="Nie znaleziono zwrotu" />
			<PageContent className="items-start">
				<p className="text-dim">
					Zwrot mógł zostać usunięty albo adres jest niepoprawny.
				</p>
				<Link
					href="/returns"
					className={buttonVariants({ variant: 'outline' })}
				>
					Wróć do listy zwrotów
				</Link>
			</PageContent>
		</section>
	);
}
