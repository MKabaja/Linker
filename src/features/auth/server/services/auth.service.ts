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
	recordFailedLogin,
	resetFailedLogins,
} from '@/features/auth/server/repositories/users.repository';
import { createSession } from './sessions.service';

type LogInResult =
	| { status: 'loggedIn'; session: NewSession }
	| { status: 'failed'; reason: LogInFailureReason };

const dummyPasswordHash = hash('dummy-password-for-timing');

/**
 * Sprawdza e-mail i hasło, a po sukcesie tworzy sesję.
 *
 * @remarks
 * - Nieznany e-mail, złe hasło i konto dezaktywowane dają ten sam wynik `invalidCredentials`.
 * - Dla nieznanego e-maila hasło jest weryfikowane z atrapą, żeby czas odpowiedzi nie zdradzał kont.
 * - Po 10 złych hasłach konto jest zablokowane na 15 minut (`locked`), także dla dobrego hasła.
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

	if (isLockedOut(user.lockedUntil, now)) {
		return { status: 'failed', reason: 'locked' };
	}

	const isPasswordValid = await verify(user.passwordHash, credentials.password);

	if (!isPasswordValid) {
		await recordFailedLogin({
			userId: user.id,
			maxFailedAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
			lockedUntil: new Date(now.getTime() + LOGIN_LOCKOUT_MILLISECONDS),
		});
		return { status: 'failed', reason: 'invalidCredentials' };
	}

	if (user.deactivatedAt) {
		return { status: 'failed', reason: 'invalidCredentials' };
	}

	if (user.failedLoginCount > 0 || user.lockedUntil) {
		await resetFailedLogins(user.id);
	}

	const session = await createSession(user.id, now);
	return { status: 'loggedIn', session };
}

function isLockedOut(lockedUntil: Date | null, now: Date): boolean {
	return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

export { logInWithPassword };
