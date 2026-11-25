import { after } from 'next/server';
import {
	isAuthorizedSyncRequest,
	syncOrderIndex,
	syncPendingPackages,
} from '@/features/returns/server/services/order-index-sync.service';

export async function POST(request: Request) {
	if (!isAuthorizedSyncRequest(request.headers.get('authorization'))) {
		return Response.json({ message: 'Brak dostępu.' }, { status: 401 });
	}

	const summary = await syncOrderIndex(new Date());

	if (summary.status === 'ok') {
		after(() => syncPendingPackages(new Date()));
	}

	return Response.json(summary, {
		status: summary.status === 'error' ? 502 : 200,
	});
}
