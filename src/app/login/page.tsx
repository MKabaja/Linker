import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
	title: 'Logowanie · Linker',
};

export default function LoginPage() {
	return (
		<section className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
			<h1 className="text-2xl font-bold">Logowanie</h1>
			<LoginForm />
		</section>
	);
}
