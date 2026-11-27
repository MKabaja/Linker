import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginCard } from '@/features/auth/components/login-card';
import { getCurrentUser } from '@/features/auth/server/services/current-user.service';

export const metadata: Metadata = {
	title: 'Logowanie · Linker',
};

export default async function LoginPage() {
	const user = await getCurrentUser();

	if (user) {
		redirect('/');
	}

	return (
		<main className="grid min-h-svh place-items-center bg-app p-4">
			<LoginCard />
		</main>
	);
}
