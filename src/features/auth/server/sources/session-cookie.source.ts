import 'server-only';
import { cookies } from 'next/headers';
import {
	SESSION_COOKIE_NAME,
	SESSION_COOKIE_OPTIONS,
} from '@/features/auth/model/auth.constants';
import type { NewSession } from '@/features/auth/model/auth.types';

/**
 * Zapisuje token sesji w ciasteczku.
 *
 * @remarks Działa tylko w Server Action i Route Handlerze (ograniczenie `cookies().set`).
 */
async function writeSessionCookie(session: NewSession) {
	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE_NAME, session.token, {
		...SESSION_COOKIE_OPTIONS,
		expires: session.expiresAt,
	});
}

export { writeSessionCookie };
