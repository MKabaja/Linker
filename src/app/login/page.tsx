import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/features/auth/components/login-form';
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
		<section className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
			<h1 className="text-2xl font-bold">Logowanie</h1>
			<LoginForm />
		</section>
	);
}
