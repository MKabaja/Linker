import type { Metadata } from 'next';
import { ReturnsScanner } from '@/features/returns/components/returns-scanner';
import { requireUser } from '@/features/auth/server/services/current-user.service';

export const metadata: Metadata = { title: 'Skaner zwrotów' };

export default async function ScanPage() {
	await requireUser();

	return (
		<section>
			<h1 className="sr-only">Skaner zwrotów</h1>
			<ReturnsScanner />
		</section>
	);
}
