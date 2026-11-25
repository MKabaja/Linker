import { requireUser } from '@/features/auth/server/services/current-user.service';

export default async function ShoppingListPage() {
	await requireUser();

	return (
		<section>
			<h1 className="text-2xl font-bold">Lista zakupów</h1>
		</section>
	);
}
