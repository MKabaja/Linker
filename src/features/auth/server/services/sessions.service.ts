import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { SESSION_DURATION_MILLISECONDS } from '@/features/auth/model/auth.constants';
import type { NewSession } from '@/features/auth/model/auth.types';
import { insertSession } from '@/features/auth/server/repositories/sessions.repository';

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

function getSessionExpiry(now: Date): Date {
	return new Date(now.getTime() + SESSION_DURATION_MILLISECONDS);
}

function hashSessionToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export { createSession };
