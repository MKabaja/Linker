import { getCurrentUser } from '@/features/auth/server/services/current-user.service';
import { searchOrdersRequestSchema } from '@/features/returns/model/returns.schemas';
import { matchOrdersByTraces } from '@/features/returns/server/services/order-matcher.service';
import { parseJsonOrNull } from '@/shared/lib/parse-json';

const MAX_BODY_CHARACTERS = 64 * 1024;

export async function POST(request: Request) {
	if (!(await getCurrentUser())) {
		return Response.json({ message: 'Zaloguj się.' }, { status: 401 });
	}

	const body = await request.text();

	if (body.length > MAX_BODY_CHARACTERS) {
		return Response.json({ message: 'Za duże zapytanie.' }, { status: 413 });
	}

	const parsedRequest = searchOrdersRequestSchema.safeParse(
		parseJsonOrNull(body),
	);

	if (!parsedRequest.success) {
		return Response.json(
			{ message: 'Oczekiwano { traces: TraceQuery[] }.' },
			{ status: 400 },
		);
	}

	return Response.json(
		await matchOrdersByTraces(parsedRequest.data.traces, new Date()),
	);
}
