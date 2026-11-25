import { requireUser } from '@/features/auth/server/services/current-user.service';

export default async function OrdersPage() {
	await requireUser();

	return (
		<section>
			<h1 className="text-2xl font-bold">Zamówienia</h1>
		</section>
	);
}
