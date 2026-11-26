import 'server-only';
import {
	LOGIN_IP_LIMIT,
	LOGIN_IP_LIMIT_WINDOW_MILLISECONDS,
} from '@/features/auth/model/auth.constants';
import {
	type AttemptWindow,
	isWindowExpired,
	registerAttempt,
} from '@/features/auth/utils/attempt-window';
import { getProcessSingleton } from '@/shared/lib/process-singleton';

type LoginRateLimitState = {
	windowByIp: Map<string, AttemptWindow>;
	lastSweepMilliseconds: number;
};

const attemptLimit = {
	windowMilliseconds: LOGIN_IP_LIMIT_WINDOW_MILLISECONDS,
	maxAttempts: LOGIN_IP_LIMIT,
};

const state = getProcessSingleton<LoginRateLimitState>(
	'auth.login-rate-limit',
	() => ({ windowByIp: new Map(), lastSweepMilliseconds: 0 }),
);

/**
 * Zlicza próbę logowania z danego IP i mówi, czy mieści się w limicie.
 *
 * @remarks
 * Stan jest w pamięci jednego procesu, więc limit nie działa między instancjami.
 * Przeterminowane wpisy są usuwane co okno, żeby mapa nie rosła bez końca.
 */
function consumeLoginAttempt(ip: string, now: Date): boolean {
	const nowMilliseconds = now.getTime();
	sweepExpiredWindows(nowMilliseconds);

	const registration = registerAttempt(
		state.windowByIp.get(ip),
		nowMilliseconds,
		attemptLimit,
	);
	state.windowByIp.set(ip, registration.window);

	return registration.isAllowed;
}

function sweepExpiredWindows(nowMilliseconds: number) {
	if (
		nowMilliseconds - state.lastSweepMilliseconds <
		LOGIN_IP_LIMIT_WINDOW_MILLISECONDS
	) {
		return;
	}

	state.lastSweepMilliseconds = nowMilliseconds;

	for (const [ip, window] of state.windowByIp) {
		if (isWindowExpired(window, nowMilliseconds, attemptLimit)) {
			state.windowByIp.delete(ip);
		}
	}
}

export { consumeLoginAttempt };
