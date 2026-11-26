import { getCurrentUser } from '@/features/auth/server/services/current-user.service';
import { clientEventBatchSchema } from '@/features/returns/model/event-log.schemas';
import { logReturnsEvent } from '@/features/returns/server/sources/event-log.source';
import { parseJsonOrNull } from '@/shared/lib/parse-json';
import { readLimitedBody } from '@/shared/lib/read-limited-body';

const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: Request) {
	const user = await getCurrentUser();

	if (!user) {
		return Response.json({ message: 'Zaloguj się.' }, { status: 401 });
	}

	const body = await readLimitedBody(request, MAX_BODY_BYTES);

	if (body.status === 'too-large') {
		return Response.json({ message: 'Za duża paczka.' }, { status: 413 });
	}

	const parsedBatch = clientEventBatchSchema.safeParse(
		body.status === 'ok' ? parseJsonOrNull(body.body.toString('utf8')) : null,
	);

	if (!parsedBatch.success) {
		return Response.json(
			{ message: 'Oczekiwano { events: ClientEvent[] }.' },
			{ status: 400 },
		);
	}

	for (const { clientAt, ...event } of parsedBatch.data.events) {
		logReturnsEvent({
			...event,
			clientAt: new Date(clientAt).toISOString(),
			userId: user.id,
			userName: user.name,
		});
	}

	return new Response(null, { status: 204 });
}
