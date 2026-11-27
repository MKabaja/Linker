const BARCODES_ONLY_WINDOW_MS = 1_200;
const FULL_FRAME_INTERVAL_MS = 1_500;
const FULL_FRAME_WITH_RETURN_LABEL_INTERVAL_MS = 4_000;
const STRIP_INTERVAL_MS = 500;
const RETURN_LABEL_TTL_MS = 3_000;
const MAX_GATE_WAIT_MS = 2_500;
const TAP_TARGET_TTL_MS = 5_000;
const TARGET_FRAME_INTERVAL_MS = 400;

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

/** `first`: pierwsza klatka po tapnięciu, bez bramki; `next`: kolejna, przez bramkę; `wait`: cel aktywny, ale jeszcze nie teraz. */
type TargetFrame = 'first' | 'next' | 'wait';

type TargetScheduleState = {
	nowMs: number;
	/** Kiedy użytkownik tapnął cel; `null`, gdy nie tapnął. */
	tappedAtMs: number | null;
	lastTargetAtMs: number;
	backoffUntilMs: number;
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

/**
 * Sprawdza, czy tapnięty cel jest jeszcze aktywny (5 s od tapnięcia).
 */
function isTapTargetActive(tappedAtMs: number | null, nowMs: number): boolean {
	return tappedAtMs !== null && nowMs - tappedAtMs < TAP_TARGET_TTL_MS;
}

/**
 * Plan klatek dla aktywnego celu, który zastępuje zwykły plan: pierwsza klatka od razu,
 * kolejne najwyżej co 0,4 s. Przerwa po odmowie serwera obowiązuje także cel.
 * Zwraca `null`, gdy celu nie ma albo wygasł (wtedy działa `pickOcrPlan`).
 */
function pickTargetFrame(state: TargetScheduleState): TargetFrame | null {
	if (!isTapTargetActive(state.tappedAtMs, state.nowMs)) {
		return null;
	}
	if (state.nowMs < state.backoffUntilMs) {
		return 'wait';
	}
	if (state.lastTargetAtMs < (state.tappedAtMs ?? 0)) {
		return 'first';
	}
	return state.nowMs - state.lastTargetAtMs >= TARGET_FRAME_INTERVAL_MS
		? 'next'
		: 'wait';
}

export {
	type GateDecisionInput,
	isTapTargetActive,
	type OcrPlan,
	type OcrScheduleState,
	pickOcrPlan,
	pickTargetFrame,
	shouldSendFrame,
	type TargetFrame,
	type TargetScheduleState,
};
