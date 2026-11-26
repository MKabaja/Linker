import 'server-only';
import { hash, verify } from '@node-rs/argon2';
import {
	LOGIN_LOCKOUT_MILLISECONDS,
	MAX_FAILED_LOGIN_ATTEMPTS,
} from '@/features/auth/model/auth.constants';
import type { LogInCredentials } from '@/features/auth/model/auth.schemas';
import type {
	LogInFailureReason,
	NewSession,
} from '@/features/auth/model/auth.types';
import {
	findUserByEmail,
	reserveLoginAttempt,
	resetFailedLogins,
} from '@/features/auth/server/repositories/users.repository';
import { createSession } from './sessions.service';

type LogInResult =
	| {
			status: 'loggedIn';
			session: NewSession;
			userId: number;
			userName: string;
	  }
	| { status: 'failed'; reason: LogInFailureReason };

const dummyPasswordHash = hash('dummy-password-for-timing');

/**
 * Sprawdza e-mail i hasło, a po sukcesie tworzy sesję.
 *
 * @remarks
 * - Nieznany e-mail, złe hasło i konto dezaktywowane dają ten sam wynik `invalidCredentials`.
 * - Dla nieznanego e-maila hasło jest weryfikowane z atrapą, żeby czas odpowiedzi nie zdradzał kont.
 * - Próba jest rezerwowana atomowo przed sprawdzeniem hasła; 10. próba w oknie blokuje konto
 *   na 15 minut, także dla dobrego hasła, a zablokowane konto też dostaje `invalidCredentials`.
 * - Dla zablokowanego konta hasło jest weryfikowane z atrapą (ten sam czas odpowiedzi).
 */
async function logInWithPassword(
	credentials: LogInCredentials,
	now: Date,
): Promise<LogInResult> {
	const user = await findUserByEmail(credentials.email);

	if (!user) {
		await verify(await dummyPasswordHash, credentials.password);
		return { status: 'failed', reason: 'invalidCredentials' };
	}

	const isAttemptReserved = await reserveLoginAttempt({
		userId: user.id,
		maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
		lockedUntil: new Date(now.getTime() + LOGIN_LOCKOUT_MILLISECONDS),
		now,
	});

	if (!isAttemptReserved) {
		await verify(await dummyPasswordHash, credentials.password);
		return { status: 'failed', reason: 'invalidCredentials' };
	}

	const isPasswordValid = await verify(user.passwordHash, credentials.password);

	if (!isPasswordValid || user.deactivatedAt) {
		return { status: 'failed', reason: 'invalidCredentials' };
	}

	await resetFailedLogins(user.id);

	const session = await createSession(user.id, now);
	return {
		status: 'loggedIn',
		session,
		userId: user.id,
		userName: user.name,
	};
}

export { logInWithPassword };
