import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/features/auth/server/services/current-user.service';
import { returnsDaySchema } from '@/features/returns/model/returns.schemas';
import { exportReturnsOfDay } from '@/features/returns/server/services/returns.service';

export async function GET(request: NextRequest) {
	if (!(await getCurrentUser())) {
		return Response.json({ message: 'Zaloguj się.' }, { status: 401 });
	}

	const parsedQuery = returnsDaySchema.safeParse({
		date: request.nextUrl.searchParams.get('date'),
	});

	if (!parsedQuery.success) {
		return Response.json(
			{ message: 'Podaj datę ?date=RRRR-MM-DD.' },
			{ status: 400 },
		);
	}

	const csvFile = await exportReturnsOfDay(parsedQuery.data.date);

	return new Response(csvFile.content, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${csvFile.fileName}"`,
			'Cache-Control': 'no-store',
		},
	});
}
