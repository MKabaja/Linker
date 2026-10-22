import { Spinner } from '@/shared/components/spinner';

export default function ProductsLoading() {
	return (
		<section>
			<h1 className="mb-6 text-2xl font-bold">Produkty z Primavery</h1>
			<Spinner label="Ładowanie produktów" />
		</section>
	);
}
