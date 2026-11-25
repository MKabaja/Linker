import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import type { UserRole } from '@/features/auth/model/auth.schemas';
import type { CurrentUser } from '@/features/auth/model/auth.types';
import { readSessionToken } from '@/features/auth/server/sources/session-cookie.source';
import { validateSessionToken } from './sessions.service';

/**
 * Zwraca zalogowanego użytkownika albo `null`, gdy brak ważnej sesji.
 *
 * @remarks
 * Wynik jest zapamiętany na czas jednego renderu (`cache` z React).
 * Ma skutki uboczne w bazie: usuwa wygasłą sesję i przedłuża sesję bliską wygaśnięcia.
 */
const getCurrentUser = cache(findCurrentUser);

/**
 * Zwraca zalogowanego użytkownika. Bez ważnej sesji przekierowuje na `/login`.
 */
async function requireUser(): Promise<CurrentUser> {
	const user = await getCurrentUser();

	if (!user) {
		redirect('/login');
	}

	return user;
}

/**
 * Zwraca zalogowanego użytkownika z podaną rolą.
 *
 * @remarks Bez sesji przekierowuje na `/login`, przy innej roli wywołuje `notFound()`.
 */
async function requireRole(role: UserRole): Promise<CurrentUser> {
	const user = await requireUser();

	if (user.role !== role) {
		notFound();
	}

	return user;
}

async function findCurrentUser(): Promise<CurrentUser | null> {
	const token = await readSessionToken();

	if (!token) {
		return null;
	}

	return validateSessionToken(token, new Date());
}

export { getCurrentUser, requireRole, requireUser };
