import Link from 'next/link';
import { ScanStatsView } from '@/features/returns/components/scan-stats-view';
import { PageContent } from '@/shared/components/page-content';
import { PageHeader } from '@/shared/components/page-header';
import { requireUser } from '@/features/auth/server/services/current-user.service';
import { getScanStats } from '@/features/returns/server/services/scan-log.service';

export default async function ReturnsStatsPage() {
	await requireUser();
	const stats = await getScanStats();

	return (
		<section>
			<PageHeader
				title="Statystyki skanera"
				actions={
					<Link href="/returns" className="text-sm text-dim hover:text-main">
						Wróć do listy zwrotów
					</Link>
				}
			/>
			<PageContent>
				<ScanStatsView stats={stats} />
			</PageContent>
		</section>
	);
}
