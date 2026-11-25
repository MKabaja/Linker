import { requireUser } from '@/features/auth/server/services/current-user.service';

export default async function SettingsPage() {
	await requireUser();

	return (
		<section>
			<h1 className="text-2xl font-bold">Ustawienia</h1>
		</section>
	);
}
