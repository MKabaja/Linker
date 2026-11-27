'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/components/button';
import { Input } from '@/shared/components/input';
import { logIn } from '@/features/auth/actions';
import type { LogInFormState } from '@/features/auth/model/auth.types';
import { loginFormStyles } from './login-form.styles';

const INITIAL_STATE: LogInFormState = { status: 'idle', email: '' };

export function LoginForm() {
	const [state, formAction, isPending] = useActionState(logIn, INITIAL_STATE);
	const { form, field, label, error } = loginFormStyles;

	return (
		<form action={formAction} className={form}>
			<div className={field}>
				<label htmlFor="email" className={label}>
					E-mail
				</label>
				<Input
					id="email"
					name="email"
					type="email"
					autoComplete="username"
					defaultValue={state.email}
					required
				/>
			</div>
			<div className={field}>
				<label htmlFor="password" className={label}>
					Hasło
				</label>
				<Input
					id="password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
				/>
			</div>
			{state.status === 'error' && (
				<p role="alert" className={error}>
					{state.message}
				</p>
			)}
			<Button type="submit" variant="accent" size="lg" disabled={isPending}>
				{isPending ? 'Logowanie…' : 'Zaloguj się'}
			</Button>
		</form>
	);
}
