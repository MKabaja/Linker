import { describe, expect, it } from 'vitest';
import {
	type OcrScheduleState,
	pickOcrPlan,
	shouldSendFrame,
} from '@/features/returns/utils/scan-plan';

const idle: OcrScheduleState = {
	nowMs: 10_000,
	scanStartedAtMs: 0,
	lastFullAtMs: 0,
	lastStripAtMs: 0,
	backoffUntilMs: 0,
	returnLabelSeenAtMs: null,
};

describe('pickOcrPlan', () => {
	it('przez pierwsze 1,2 s czyta tylko kody', () => {
		expect(
			pickOcrPlan({ ...idle, nowMs: 1_000, scanStartedAtMs: 0 }),
		).toBeNull();
		expect(pickOcrPlan({ ...idle, nowMs: 1_600 })).toBe('full');
	});

	it('pełna klatka najwyżej co 1,5 s', () => {
		expect(pickOcrPlan({ ...idle, lastFullAtMs: 9_000 })).toBeNull();
		expect(pickOcrPlan({ ...idle, lastFullAtMs: 8_400 })).toBe('full');
	});

	it('przerwa po odmowie serwera blokuje wysyłkę', () => {
		expect(pickOcrPlan({ ...idle, backoffUntilMs: 10_500 })).toBeNull();
	});

	it('przy świeżej etykiecie zwrotnej wysyła pasek co 0,5 s, także w pierwszej sekundzie', () => {
		const withLabel = {
			...idle,
			nowMs: 800,
			returnLabelSeenAtMs: 700,
			lastStripAtMs: 0,
		};

		expect(pickOcrPlan(withLabel)).toBe('strip');
		expect(pickOcrPlan({ ...withLabel, lastStripAtMs: 500 })).toBeNull();
	});

	it('przy etykiecie zwrotnej pełna klatka dopiero po 4 s', () => {
		const withLabel = {
			...idle,
			nowMs: 5_000,
			returnLabelSeenAtMs: 4_900,
			lastStripAtMs: 4_800,
		};

		expect(pickOcrPlan({ ...withLabel, lastFullAtMs: 2_000 })).toBeNull();
		expect(pickOcrPlan({ ...withLabel, lastFullAtMs: 900 })).toBe('full');
	});

	it('po 3 s od ostatniego widzenia etykiety wraca do zwykłego planu', () => {
		expect(
			pickOcrPlan({ ...idle, returnLabelSeenAtMs: 6_000, lastStripAtMs: 0 }),
		).toBe('full');
	});
});

describe('shouldSendFrame', () => {
	it('wysyła ostrą klatkę od razu', () => {
		expect(
			shouldSendFrame({ isGateReady: true, nowMs: 100, lastSentAtMs: 99 }),
		).toBe(true);
	});

	it('odrzuca nieostrą klatkę przed 2,5 s i wysyła ją po tym czasie', () => {
		expect(
			shouldSendFrame({ isGateReady: false, nowMs: 2_000, lastSentAtMs: 0 }),
		).toBe(false);
		expect(
			shouldSendFrame({ isGateReady: false, nowMs: 2_500, lastSentAtMs: 0 }),
		).toBe(true);
	});
});
