'use server';

import { redirect } from 'next/navigation';
import { logInErrorMessageByReason } from '@/features/auth/model/auth.constants';
import { logInSchema } from '@/features/auth/model/auth.schemas';
import type { LogInFormState } from '@/features/auth/model/auth.types';
import { logInWithPassword } from '@/features/auth/server/services/auth.service';
import { consumeLoginAttempt } from '@/features/auth/server/services/login-rate-limit.service';
import { deleteSessionByToken } from '@/features/auth/server/services/sessions.service';
import { readClientIp } from '@/features/auth/server/sources/client-ip.source';
import {
	deleteSessionCookie,
	readSessionToken,
	writeSessionCookie,
} from '@/features/auth/server/sources/session-cookie.source';

async function logIn(
	_previousState: LogInFormState,
	formData: FormData,
): Promise<LogInFormState> {
	const email = String(formData.get('email') ?? '');
	const parsedCredentials = logInSchema.safeParse({
		email,
		password: formData.get('password'),
	});

	if (!parsedCredentials.success) {
		return {
			status: 'error',
			email,
			message: logInErrorMessageByReason.invalidCredentials,
		};
	}

	const now = new Date();

	if (!consumeLoginAttempt(await readClientIp(), now)) {
		return {
			status: 'error',
			email,
			message: logInErrorMessageByReason.invalidCredentials,
		};
	}

	const result = await logInWithPassword(parsedCredentials.data, now);

	if (result.status === 'failed') {
		return {
			status: 'error',
			email,
			message: logInErrorMessageByReason[result.reason],
		};
	}

	await writeSessionCookie(result.session);
	redirect('/');
}

async function logOut() {
	const sessionToken = await readSessionToken();

	if (sessionToken) {
		await deleteSessionByToken(sessionToken);
	}

	await deleteSessionCookie();
	redirect('/login');
}

export { logIn, logOut };
