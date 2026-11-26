import Link from 'next/link';
import { buttonVariants } from '@/shared/components/button';

export default function ReturnNotFound() {
	return (
		<section className="flex flex-col items-start gap-4 pt-4">
			<h1 className="text-2xl font-bold">Nie znaleziono zwrotu</h1>
			<p className="text-dim">
				Zwrot mógł zostać usunięty albo adres jest niepoprawny.
			</p>
			<Link href="/returns" className={buttonVariants({ variant: 'outline' })}>
				Wróć do listy zwrotów
			</Link>
		</section>
	);
}
