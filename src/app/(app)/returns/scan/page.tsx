import { requireUser } from '@/features/auth/server/services/current-user.service';

export default async function ScanPage() {
	await requireUser();

	return (
		<section>
			<h1 className="text-2xl font-bold">Skaner</h1>
		</section>
	);
}
