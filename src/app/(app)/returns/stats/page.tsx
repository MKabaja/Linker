import Link from 'next/link';
import { ScanStatsView } from '@/features/returns/components/scan-stats-view';
import { requireUser } from '@/features/auth/server/services/current-user.service';
import { getScanStats } from '@/features/returns/server/services/scan-log.service';

export default async function ReturnsStatsPage() {
	await requireUser();
	const stats = await getScanStats();

	return (
		<section className="flex flex-col gap-6 pt-4">
			<h1 className="text-2xl font-bold">Statystyki skanera</h1>
			<Link href="/returns" className="text-sm text-dim hover:text-main">
				Wróć do listy zwrotów
			</Link>
			<ScanStatsView stats={stats} />
		</section>
	);
}
