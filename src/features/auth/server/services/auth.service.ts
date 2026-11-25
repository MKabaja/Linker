import 'server-only';
import { hash, verify } from '@node-rs/argon2';
import type { LogInCredentials } from '@/features/auth/model/auth.schemas';
import type {
	LogInFailureReason,
	NewSession,
} from '@/features/auth/model/auth.types';
import { findUserByEmail } from '@/features/auth/server/repositories/users.repository';
import { createSession } from './sessions.service';

type LogInResult =
	| { status: 'loggedIn'; session: NewSession }
	| { status: 'failed'; reason: LogInFailureReason };

const dummyPasswordHash = hash('dummy-password-for-timing');

/**
 * Sprawdza e-mail i hasło, a po sukcesie tworzy sesję.
 *
 * @remarks
 * Nieznany e-mail, złe hasło i konto dezaktywowane dają ten sam wynik `invalidCredentials`.
 * Dla nieznanego e-maila hasło jest weryfikowane z atrapą, żeby czas odpowiedzi nie zdradzał kont.
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

	const isPasswordValid = await verify(user.passwordHash, credentials.password);

	if (!isPasswordValid || user.deactivatedAt) {
		return { status: 'failed', reason: 'invalidCredentials' };
	}

	const session = await createSession(user.id, now);
	return { status: 'loggedIn', session };
}

export { logInWithPassword };
