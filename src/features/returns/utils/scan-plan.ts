const BARCODES_ONLY_WINDOW_MS = 1_200;
const FULL_FRAME_INTERVAL_MS = 1_500;
const FULL_FRAME_WITH_RETURN_LABEL_INTERVAL_MS = 4_000;
const STRIP_INTERVAL_MS = 500;
const RETURN_LABEL_TTL_MS = 3_000;
const MAX_GATE_WAIT_MS = 2_500;

type OcrPlan = 'strip' | 'full';

type OcrScheduleState = {
	nowMs: number;
	scanStartedAtMs: number;
	lastFullAtMs: number;
	lastStripAtMs: number;
	backoffUntilMs: number;
	/** Kiedy ostatnio widziano kod zwrotny InPost; `null`, gdy nie widziano. */
	returnLabelSeenAtMs: number | null;
};

type GateDecisionInput = {
	isGateReady: boolean;
	nowMs: number;
	lastSentAtMs: number;
};

/**
 * Wybiera, co wysłać do OCR w tym takcie: pasek pod DataMatrix, pełną klatkę albo nic.
 * Przez pierwsze 1,2 s skanu i podczas przerwy po odmowie serwera zwraca `null`.
 */
function pickOcrPlan(state: OcrScheduleState): OcrPlan | null {
	if (state.nowMs < state.backoffUntilMs) {
		return null;
	}
	const isReturnLabelFresh =
		state.returnLabelSeenAtMs !== null &&
		state.nowMs - state.returnLabelSeenAtMs < RETURN_LABEL_TTL_MS;
	if (isReturnLabelFresh) {
		if (state.nowMs - state.lastStripAtMs >= STRIP_INTERVAL_MS) {
			return 'strip';
		}
		return state.nowMs - state.lastFullAtMs >=
			FULL_FRAME_WITH_RETURN_LABEL_INTERVAL_MS
			? 'full'
			: null;
	}
	if (state.nowMs - state.scanStartedAtMs < BARCODES_ONLY_WINDOW_MS) {
		return null;
	}
	return state.nowMs - state.lastFullAtMs >= FULL_FRAME_INTERVAL_MS
		? 'full'
		: null;
}

/**
 * Klatka idzie na serwer, gdy jest ostra i nieruchoma, ale najpóźniej po 2,5 s od ostatniej wysyłki
 * (zbyt ostra bramka zatrzymywała skan nawet na 80 s).
 */
function shouldSendFrame({
	isGateReady,
	nowMs,
	lastSentAtMs,
}: GateDecisionInput): boolean {
	return isGateReady || nowMs - lastSentAtMs >= MAX_GATE_WAIT_MS;
}

export {
	type GateDecisionInput,
	type OcrPlan,
	type OcrScheduleState,
	pickOcrPlan,
	shouldSendFrame,
};
