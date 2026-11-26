import { type NextRequest, NextResponse } from 'next/server';
import {
	SESSION_COOKIE_NAME,
	SESSION_COOKIE_OPTIONS,
	SESSION_DURATION_MILLISECONDS,
} from '@/features/auth/model/auth.constants';

export function proxy(request: NextRequest) {
	const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

	if (!sessionToken) {
		if (request.nextUrl.pathname.startsWith('/api/')) {
			return Response.json({ error: 'unauthorized' }, { status: 401 });
		}

		return NextResponse.redirect(new URL('/login', request.url));
	}

	const response = NextResponse.next();

	if (request.method === 'GET') {
		response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
			...SESSION_COOKIE_OPTIONS,
			maxAge: SESSION_DURATION_MILLISECONDS / 1000,
		});
	}

	return response;
}

export const config = {
	matcher: [
		'/((?!login$|api/returns/sync$|_next/static|_next/image|favicon\\.ico$|.*\\.[a-zA-Z0-9]+$).*)',
	],
};
