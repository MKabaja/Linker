type AttemptWindow = {
	startedAtMilliseconds: number;
	attemptCount: number;
};

type AttemptLimit = {
	windowMilliseconds: number;
	maxAttempts: number;
};

type AttemptRegistration = {
	window: AttemptWindow;
	isAllowed: boolean;
};

/**
 * Rejestruje próbę w oknie stałym i mówi, czy mieści się w limicie.
 *
 * @remarks
 * - Brak okna albo okno po upływie `windowMilliseconds` zaczyna się od nowa od tej próby.
 * - Próba ponad limit nie zwiększa licznika, więc okno kończy się o stałej porze.
 */
function registerAttempt(
	window: AttemptWindow | undefined,
	nowMilliseconds: number,
	limit: AttemptLimit,
): AttemptRegistration {
	if (!window || isWindowExpired(window, nowMilliseconds, limit)) {
		return {
			window: { startedAtMilliseconds: nowMilliseconds, attemptCount: 1 },
			isAllowed: limit.maxAttempts >= 1,
		};
	}

	if (window.attemptCount >= limit.maxAttempts) {
		return { window, isAllowed: false };
	}

	return {
		window: { ...window, attemptCount: window.attemptCount + 1 },
		isAllowed: true,
	};
}

function isWindowExpired(
	window: AttemptWindow,
	nowMilliseconds: number,
	limit: AttemptLimit,
): boolean {
	return (
		nowMilliseconds - window.startedAtMilliseconds >= limit.windowMilliseconds
	);
}

export {
	type AttemptLimit,
	type AttemptWindow,
	isWindowExpired,
	registerAttempt,
};
