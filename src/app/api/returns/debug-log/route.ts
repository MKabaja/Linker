import { getCurrentUser } from '@/features/auth/server/services/current-user.service';
import { logScannerDebugEvents } from '@/features/returns/server/services/scan-log.service';
import { parseJsonOrNull } from '@/shared/lib/parse-json';

const MAX_BODY_CHARACTERS = 16 * 1024;

export async function POST(request: Request) {
	const user = await getCurrentUser();

	if (!user) {
		return Response.json({ message: 'Zaloguj się.' }, { status: 401 });
	}

	const body = await request.text();

	if (body.length > MAX_BODY_CHARACTERS) {
		return new Response(null, { status: 413 });
	}

	const result = logScannerDebugEvents({
		events: parseJsonOrNull(body),
		userId: user.id,
		now: new Date(),
	});

	return new Response(null, { status: result === 'logged' ? 204 : 404 });
}
