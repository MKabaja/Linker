import 'server-only';
import { getReturnsConfig } from '@/features/returns/server/sources/returns.config';
import { getProcessSingleton } from '@/shared/lib/process-singleton';
import {
	syncOrderIndex,
	syncPendingPackages,
} from './order-index-sync.service';

const SYNC_INTERVAL_MILLISECONDS = 2 * 60_000;
const FIRST_SYNC_DELAY_MILLISECONDS = 15_000;

type SchedulerState = { isStarted: boolean };

const schedulerState = getProcessSingleton<SchedulerState>(
	'returns.order-index-scheduler',
	() => ({ isStarted: false }),
);

/**
 * Uruchamia w tle synchronizację indeksu zamówień z BaseLinkerem: pierwsza po 15 s, potem co 2 minuty.
 *
 * @remarks
 * Nic nie robi, gdy `RETURNS_SYNC_ENABLED` nie jest `true`. Wywołanie drugi raz w tym samym procesie
 * (np. po HMR) nie tworzy drugiego harmonogramu. Błędy są logowane i nie zatrzymują kolejnych rund.
 */
export function startOrderIndexScheduler() {
	if (schedulerState.isStarted || !getReturnsConfig().isSyncEnabled) {
		return;
	}

	schedulerState.isStarted = true;
	console.log('[returns] Synchronizacja zamówień z BaseLinkerem co 2 min.');
	setTimeout(runSyncRound, FIRST_SYNC_DELAY_MILLISECONDS);
	setInterval(runSyncRound, SYNC_INTERVAL_MILLISECONDS);
}

async function runSyncRound() {
	try {
		const ordersSummary = await syncOrderIndex(new Date());

		if (ordersSummary.status === 'error') {
			console.error('[returns] Synchronizacja zamówień:', ordersSummary);
			return;
		}
		if (ordersSummary.status !== 'ok') {
			return;
		}

		const packagesSummary = await syncPendingPackages(new Date());

		if (packagesSummary.status === 'error') {
			console.error('[returns] Synchronizacja paczek:', packagesSummary);
		}
	} catch (error) {
		console.error('[returns] Synchronizacja przerwana:', error);
	}
}
