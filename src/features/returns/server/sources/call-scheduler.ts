const BACKGROUND_SLOT_INTERVAL = 4;

type CallPriority = 'interactive' | 'background';

type SchedulerState = {
	interactiveWaiting: number;
	backgroundWaiting: number;
	interactiveStreak: number;
	lastCallAt: number;
};

type SchedulerInput = {
	state: SchedulerState;
	now: number;
	pauseMilliseconds: number;
};

type SchedulerDecision =
	| { action: 'idle' }
	| { action: 'wait'; milliseconds: number }
	| { action: 'run'; priority: CallPriority };

/**
 * Wybiera, co zrobić z kolejką wywołań BaseLinkera.
 *
 * @remarks
 * Pauza między każdymi dwoma wywołaniami (bez względu na priorytet) jest wspólna, bo limit BaseLinkera dotyczy całego tokenu.
 * Wywołanie interaktywne wyprzedza czekające wywołania w tle, ale po `BACKGROUND_SLOT_INTERVAL - 1` interaktywnych z rzędu
 * wywołanie w tle dostaje jeden slot, więc tło nie jest głodzone. Tło nie głodzi interaktywnych, bo zajmuje najwyżej co czwarty slot.
 * W obrębie priorytetu obowiązuje FIFO (zapewnia je osobna kolejka na priorytet).
 */
function decideNextCall({
	state,
	now,
	pauseMilliseconds,
}: SchedulerInput): SchedulerDecision {
	const hasInteractive = state.interactiveWaiting > 0;
	const hasBackground = state.backgroundWaiting > 0;

	if (!hasInteractive && !hasBackground) {
		return { action: 'idle' };
	}

	const waitMilliseconds = state.lastCallAt + pauseMilliseconds - now;

	if (waitMilliseconds > 0) {
		return { action: 'wait', milliseconds: waitMilliseconds };
	}

	const isBackgroundTurn =
		hasBackground &&
		(!hasInteractive ||
			state.interactiveStreak >= BACKGROUND_SLOT_INTERVAL - 1);

	return {
		action: 'run',
		priority: isBackgroundTurn ? 'background' : 'interactive',
	};
}

function countInteractiveStreak(
	previousStreak: number,
	priority: CallPriority,
): number {
	return priority === 'interactive' ? previousStreak + 1 : 0;
}

export {
	BACKGROUND_SLOT_INTERVAL,
	type CallPriority,
	countInteractiveStreak,
	decideNextCall,
	type SchedulerDecision,
	type SchedulerState,
};
