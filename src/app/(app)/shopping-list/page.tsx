import { PageHeader } from '@/shared/components/page-header';
import { requireUser } from '@/features/auth/server/services/current-user.service';

export default async function ShoppingListPage() {
	await requireUser();

	return (
		<section>
			<PageHeader title="Lista zakupów" />
		</section>
	);
}
