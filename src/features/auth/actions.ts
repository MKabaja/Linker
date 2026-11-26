'use server';

import { redirect } from 'next/navigation';
import { logInErrorMessageByReason } from '@/features/auth/model/auth.constants';
import { logInSchema } from '@/features/auth/model/auth.schemas';
import type { LogInFormState } from '@/features/auth/model/auth.types';
import { logInWithPassword } from '@/features/auth/server/services/auth.service';
import { getCurrentUser } from '@/features/auth/server/services/current-user.service';
import { consumeLoginAttempt } from '@/features/auth/server/services/login-rate-limit.service';
import { deleteSessionByToken } from '@/features/auth/server/services/sessions.service';
import { readClientIp } from '@/features/auth/server/sources/client-ip.source';
import {
	deleteSessionCookie,
	readSessionToken,
	writeSessionCookie,
} from '@/features/auth/server/sources/session-cookie.source';
import { logReturnsEvent } from '@/features/returns/server/sources/event-log.source';

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
		logReturnsEvent({
			type: 'auth.login',
			outcome: 'failed',
			reason: 'invalidInput',
		});
		return {
			status: 'error',
			email,
			message: logInErrorMessageByReason.invalidCredentials,
		};
	}

	const now = new Date();

	if (!consumeLoginAttempt(await readClientIp(), now)) {
		logReturnsEvent({
			type: 'auth.login',
			outcome: 'failed',
			reason: 'rateLimited',
		});
		return {
			status: 'error',
			email,
			message: logInErrorMessageByReason.invalidCredentials,
		};
	}

	const result = await logInWithPassword(parsedCredentials.data, now);

	if (result.status === 'failed') {
		logReturnsEvent({
			type: 'auth.login',
			outcome: 'failed',
			reason: result.reason,
		});
		return {
			status: 'error',
			email,
			message: logInErrorMessageByReason[result.reason],
		};
	}

	logReturnsEvent({
		type: 'auth.login',
		outcome: 'success',
		userId: result.userId,
		userName: result.userName,
	});
	await writeSessionCookie(result.session);
	redirect('/');
}

async function logOut() {
	const user = await getCurrentUser();
	const sessionToken = await readSessionToken();

	logReturnsEvent({
		type: 'auth.logout',
		userId: user?.id,
		userName: user?.name,
	});

	if (sessionToken) {
		await deleteSessionByToken(sessionToken);
	}

	await deleteSessionCookie();
	redirect('/login');
}

export { logIn, logOut };
