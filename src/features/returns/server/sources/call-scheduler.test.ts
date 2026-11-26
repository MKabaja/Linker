import { describe, expect, it } from 'vitest';
import {
	BACKGROUND_SLOT_INTERVAL,
	type CallPriority,
	countInteractiveStreak,
	decideNextCall,
	type SchedulerState,
} from './call-scheduler';

const PAUSE_MILLISECONDS = 1500;
const NOW = 1_000_000;

function makeState(overrides: Partial<SchedulerState>): SchedulerState {
	return {
		interactiveWaiting: 0,
		backgroundWaiting: 0,
		interactiveStreak: 0,
		lastCallAt: 0,
		...overrides,
	};
}

function decide(state: SchedulerState, now = NOW) {
	return decideNextCall({ state, now, pauseMilliseconds: PAUSE_MILLISECONDS });
}

describe('decideNextCall', () => {
	it('is idle for empty queues', () => {
		expect(decide(makeState({}))).toEqual({ action: 'idle' });
	});

	it('prefers interactive over background', () => {
		const decision = decide(
			makeState({ interactiveWaiting: 1, backgroundWaiting: 5 }),
		);

		expect(decision).toEqual({ action: 'run', priority: 'interactive' });
	});

	it('runs background when nothing interactive waits', () => {
		const decision = decide(makeState({ backgroundWaiting: 1 }));

		expect(decision).toEqual({ action: 'run', priority: 'background' });
	});

	it('keeps the pause between any two calls regardless of priority', () => {
		const state = makeState({
			interactiveWaiting: 1,
			lastCallAt: NOW - 500,
		});

		expect(decide(state)).toEqual({ action: 'wait', milliseconds: 1000 });
		expect(decide(state, NOW + 1000)).toEqual({
			action: 'run',
			priority: 'interactive',
		});
	});

	it('gives background a slot after a streak of interactive calls', () => {
		const decision = decide(
			makeState({
				interactiveWaiting: 3,
				backgroundWaiting: 1,
				interactiveStreak: BACKGROUND_SLOT_INTERVAL - 1,
			}),
		);

		expect(decision).toEqual({ action: 'run', priority: 'background' });
	});

	it('never starves background nor interactive in a long mixed run', () => {
		let state = makeState({ interactiveWaiting: 100, backgroundWaiting: 100 });
		const order: CallPriority[] = [];

		for (let call = 0; call < 40; call++) {
			const decision = decide(state);

			if (decision.action !== 'run') {
				throw new Error('Expected a run decision');
			}

			order.push(decision.priority);
			state = {
				interactiveWaiting:
					state.interactiveWaiting -
					(decision.priority === 'interactive' ? 1 : 0),
				backgroundWaiting:
					state.backgroundWaiting -
					(decision.priority === 'background' ? 1 : 0),
				interactiveStreak: countInteractiveStreak(
					state.interactiveStreak,
					decision.priority,
				),
				lastCallAt: 0,
			};
		}

		expect(order.filter((priority) => priority === 'background')).toHaveLength(
			10,
		);
		expect(order.slice(0, 4)).toEqual([
			'interactive',
			'interactive',
			'interactive',
			'background',
		]);
	});
});

describe('countInteractiveStreak', () => {
	it('grows on interactive calls and resets on background', () => {
		expect(countInteractiveStreak(2, 'interactive')).toBe(3);
		expect(countInteractiveStreak(2, 'background')).toBe(0);
	});
});
