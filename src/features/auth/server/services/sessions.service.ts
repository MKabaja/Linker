import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import {
	SESSION_DURATION_MILLISECONDS,
	SESSION_RENEWAL_THRESHOLD_MILLISECONDS,
} from '@/features/auth/model/auth.constants';
import type { CurrentUser, NewSession } from '@/features/auth/model/auth.types';
import {
	deleteSession,
	findSessionWithUser,
	insertSession,
	updateSessionExpiry,
} from '@/features/auth/server/repositories/sessions.repository';

/**
 * Tworzy sesję w bazie. Baza dostaje tylko hash SHA-256 tokenu.
 *
 * @returns Token w postaci jawnej, przeznaczony wyłącznie do ciasteczka.
 */
async function createSession(userId: number, now: Date): Promise<NewSession> {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = getSessionExpiry(now);

	await insertSession({ id: hashSessionToken(token), userId, expiresAt });

	return { token, expiresAt };
}

/**
 * Zwraca właściciela ważnej sesji.
 *
 * @remarks
 * Sesję wygasłą albo należącą do konta dezaktywowanego usuwa z bazy i zwraca `null`.
 * Sesję, której zostało mniej niż 15 dni, przedłuża do pełnych 30 dni.
 */
async function validateSessionToken(
	token: string,
	now: Date,
): Promise<CurrentUser | null> {
	const sessionId = hashSessionToken(token);
	const session = await findSessionWithUser(sessionId);

	if (!session) {
		return null;
	}

	const { deactivatedAt, ...user } = session.user;

	if (deactivatedAt || isSessionExpired(session.expiresAt, now)) {
		await deleteSession(sessionId);
		return null;
	}

	if (shouldRenewSession(session.expiresAt, now)) {
		await updateSessionExpiry(sessionId, getSessionExpiry(now));
	}

	return user;
}

async function deleteSessionByToken(token: string) {
	await deleteSession(hashSessionToken(token));
}

function isSessionExpired(expiresAt: Date, now: Date): boolean {
	return expiresAt.getTime() <= now.getTime();
}

function shouldRenewSession(expiresAt: Date, now: Date): boolean {
	const millisecondsLeft = expiresAt.getTime() - now.getTime();
	return millisecondsLeft < SESSION_RENEWAL_THRESHOLD_MILLISECONDS;
}

function getSessionExpiry(now: Date): Date {
	return new Date(now.getTime() + SESSION_DURATION_MILLISECONDS);
}

function hashSessionToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export { createSession, deleteSessionByToken, validateSessionToken };
