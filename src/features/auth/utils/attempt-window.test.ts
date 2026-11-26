import { describe, expect, it } from 'vitest';
import {
	type AttemptLimit,
	isWindowExpired,
	registerAttempt,
} from './attempt-window';

const limit: AttemptLimit = { windowMilliseconds: 1000, maxAttempts: 3 };

describe('registerAttempt', () => {
	it('otwiera okno przy pierwszej próbie', () => {
		const { window, isAllowed } = registerAttempt(undefined, 500, limit);

		expect(isAllowed).toBe(true);
		expect(window).toEqual({ startedAtMilliseconds: 500, attemptCount: 1 });
	});

	it('przepuszcza próby do limitu i odrzuca kolejne', () => {
		let window = registerAttempt(undefined, 0, limit).window;
		const results: boolean[] = [];

		for (let attempt = 0; attempt < 5; attempt++) {
			const registration = registerAttempt(window, 100, limit);
			window = registration.window;
			results.push(registration.isAllowed);
		}

		expect(results).toEqual([true, true, false, false, false]);
		expect(window.attemptCount).toBe(3);
	});

	it('zaczyna nowe okno po upływie czasu', () => {
		const full = { startedAtMilliseconds: 0, attemptCount: 3 };

		const { window, isAllowed } = registerAttempt(full, 1000, limit);

		expect(isAllowed).toBe(true);
		expect(window).toEqual({ startedAtMilliseconds: 1000, attemptCount: 1 });
	});
});

describe('isWindowExpired', () => {
	it('zwraca true dokładnie po upływie okna', () => {
		const window = { startedAtMilliseconds: 0, attemptCount: 1 };

		expect(isWindowExpired(window, 999, limit)).toBe(false);
		expect(isWindowExpired(window, 1000, limit)).toBe(true);
	});
});
