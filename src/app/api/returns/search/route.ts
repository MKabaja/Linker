import { getCurrentUser } from '@/features/auth/server/services/current-user.service';
import { searchOrdersRequestSchema } from '@/features/returns/model/returns.schemas';
import { searchOrders } from '@/features/returns/server/services/order-search.service';
import { parseJsonOrNull } from '@/shared/lib/parse-json';
import { readLimitedBody } from '@/shared/lib/read-limited-body';

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
	if (!(await getCurrentUser())) {
		return Response.json({ message: 'Zaloguj się.' }, { status: 401 });
	}

	const body = await readLimitedBody(request, MAX_BODY_BYTES);

	if (body.status === 'too-large') {
		return Response.json({ message: 'Za duże zapytanie.' }, { status: 413 });
	}

	const parsedRequest = searchOrdersRequestSchema.safeParse(
		body.status === 'ok' ? parseJsonOrNull(body.body.toString('utf8')) : null,
	);

	if (!parsedRequest.success) {
		return Response.json(
			{ message: 'Oczekiwano { traces: TraceQuery[] }.' },
			{ status: 400 },
		);
	}

	return Response.json(
		await searchOrders(parsedRequest.data.traces, new Date()),
	);
}
