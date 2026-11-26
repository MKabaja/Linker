'use client';

import {
	type RefObject,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from 'react';
import type { OcrResponse } from '@/features/returns/model/ocr.types';
import type { RawRead, Rect } from '@/features/returns/model/traces.types';
import { readsFromOcr } from '@/features/returns/utils/read-classifier';
import {
	type OcrPlan,
	pickOcrPlan,
	shouldSendFrame,
} from '@/features/returns/utils/scan-plan';
import {
	type FrameCrop,
	frameRectToVideo,
	isSquareLike,
	stripRegionBelowDataMatrix,
} from '@/features/returns/utils/scanner-geometry';
import {
	type CapturedFrame,
	createFramePipeline,
	type FramePipeline,
} from './frame-pipeline';
import type { ScanDiagnostics } from './scan-diagnostics';

const TICK_MS = 250;
const BACKOFF_MS = 1_000;
const REQUEST_TIMEOUT_MS = 10_000;
const OCR_URL = '/api/returns/ocr';

type ScheduleRuntime = {
	startedAtMs: number;
	lastFullAtMs: number;
	lastStripAtMs: number;
	backoffUntilMs: number;
	isBusy: boolean;
	returnLabel: { bbox: Rect; seenAtMs: number } | null;
};

type UseOcrLoopOptions = {
	videoRef: RefObject<HTMLVideoElement | null>;
	isEnabled: boolean;
	isPaused: boolean;
	/** Identyfikator skanu dla serwera: najwyżej jedna czekająca klatka z tego telefonu. */
	scanSession: string;
	diagnostics: ScanDiagnostics;
	onReads: (reads: RawRead[]) => void;
};

type UseOcrLoopResult = {
	/** Zgłasza kod zwrotny InPost (DataMatrix); przez 3 s co 0,5 s czytany jest pasek pod nim. */
	noteReturnLabel: (bbox: Rect | undefined) => void;
	hasReturnLabel: boolean;
};

/**
 * Pętla OCR: co 250 ms, gdy poprzednia odpowiedź już wróciła (nigdy kolejka), plan z `pickOcrPlan`
 * sprawdza bramkę ostrości i ruchu w wątku, a klatka (JPEG q 0,75, maks. 1280 px) idzie na serwer.
 * Odpowiedzi 409 i 503 dają przerwę 1 s. Zapytanie ma limit 10 s i jest przerywane z pętlą.
 */
function useOcrLoop({
	videoRef,
	isEnabled,
	isPaused,
	scanSession,
	diagnostics,
	onReads,
}: UseOcrLoopOptions): UseOcrLoopResult {
	const [hasReturnLabel, setHasReturnLabel] = useState(false);
	const pipelineRef = useRef<FramePipeline | null>(null);
	const runtimeRef = useRef<ScheduleRuntime>(createRuntime(0));
	const handleReads = useEffectEvent(onReads);

	useEffect(() => {
		if (!isEnabled) {
			return;
		}
		const pipeline = createFramePipeline();
		pipeline.reset();
		pipelineRef.current = pipeline;
		runtimeRef.current = createRuntime(Date.now());
		return () => {
			pipelineRef.current = null;
			pipeline.dispose();
		};
	}, [isEnabled]);

	useEffect(() => {
		if (!isEnabled || isPaused) {
			return;
		}
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout> | undefined;

		async function tick() {
			try {
				await runTick(controller.signal);
			} catch {
				// Zrzut klatki albo wątek chwilowo zawiódł: kolejna próba przy następnym takcie.
			}
			if (!controller.signal.aborted) {
				timer = setTimeout(() => void tick(), TICK_MS);
			}
		}

		async function runTick(signal: AbortSignal) {
			const video = videoRef.current;
			const pipeline = pipelineRef.current;
			const runtime = runtimeRef.current;
			if (!video || !pipeline || runtime.isBusy || document.hidden) {
				return;
			}
			const nowMs = Date.now();
			const plan = pickOcrPlan({
				nowMs,
				scanStartedAtMs: runtime.startedAtMs,
				lastFullAtMs: runtime.lastFullAtMs,
				lastStripAtMs: runtime.lastStripAtMs,
				backoffUntilMs: runtime.backoffUntilMs,
				returnLabelSeenAtMs: runtime.returnLabel?.seenAtMs ?? null,
			});
			if (!plan) {
				return;
			}
			const gate = await pipeline.measure(video);
			diagnostics.noteGate(gate?.isReady === true);
			const lastSentAtMs = Math.max(
				runtime.lastFullAtMs,
				runtime.lastStripAtMs,
				runtime.startedAtMs,
			);
			if (
				shouldSendFrame({
					isGateReady: gate?.isReady === true,
					nowMs,
					lastSentAtMs,
				})
			) {
				await sendFrame({ video, pipeline, plan, nowMs, signal });
			}
		}

		async function sendFrame({
			video,
			pipeline,
			plan,
			nowMs,
			signal,
		}: SendFrameInput) {
			const runtime = runtimeRef.current;
			const startedAt = performance.now();
			runtime.isBusy = true;
			if (plan === 'strip') {
				runtime.lastStripAtMs = nowMs;
			} else {
				runtime.lastFullAtMs = nowMs;
			}
			try {
				const frame = await captureForPlan({
					video,
					pipeline,
					plan,
					returnLabel: runtime.returnLabel?.bbox,
				});
				diagnostics.noteCapture(performance.now() - startedAt);
				if (!frame || signal.aborted) {
					return;
				}
				const response = await fetch(OCR_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'image/jpeg',
						'X-Scan-Session': scanSession,
						'X-Ocr-Mode': frame.isStrip ? 'strip' : 'full',
					},
					body: frame.blob,
					signal: AbortSignal.any([
						signal,
						AbortSignal.timeout(REQUEST_TIMEOUT_MS),
					]),
				});
				if (response.status === 409 || response.status === 503) {
					runtime.backoffUntilMs = Date.now() + BACKOFF_MS;
					diagnostics.noteOcrRejected();
					return;
				}
				if (!response.ok) {
					diagnostics.noteOcrError();
					return;
				}
				const ocr: OcrResponse = await response.json();
				diagnostics.noteOcr(ocr, performance.now() - startedAt);
				if (!signal.aborted) {
					handleReads(readsFromOcr(toVideoCoordinates(ocr, frame)));
				}
			} catch {
				if (!signal.aborted) {
					diagnostics.noteOcrError();
					runtime.backoffUntilMs = Date.now() + BACKOFF_MS;
				}
			} finally {
				runtime.isBusy = false;
			}
		}

		timer = setTimeout(() => void tick(), TICK_MS);
		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [isEnabled, isPaused, videoRef, scanSession, diagnostics]);

	function noteReturnLabel(bbox: Rect | undefined) {
		setHasReturnLabel(true);
		if (bbox && isSquareLike(bbox)) {
			runtimeRef.current.returnLabel = { bbox, seenAtMs: Date.now() };
		}
	}

	return { noteReturnLabel, hasReturnLabel };
}

type SendFrameInput = {
	video: HTMLVideoElement;
	pipeline: FramePipeline;
	plan: OcrPlan;
	nowMs: number;
	signal: AbortSignal;
};

type CaptureInput = {
	video: HTMLVideoElement;
	pipeline: FramePipeline;
	plan: OcrPlan;
	returnLabel: Rect | undefined;
};

function createRuntime(startedAtMs: number): ScheduleRuntime {
	return {
		startedAtMs,
		lastFullAtMs: 0,
		lastStripAtMs: 0,
		backoffUntilMs: 0,
		isBusy: false,
		returnLabel: null,
	};
}

async function captureForPlan({
	video,
	pipeline,
	plan,
	returnLabel,
}: CaptureInput): Promise<CapturedFrame | null> {
	if (plan === 'strip' && returnLabel) {
		const strip = await pipeline.capture(
			video,
			stripRegionBelowDataMatrix(returnLabel),
		);
		if (strip) {
			return strip;
		}
	}
	return pipeline.capture(video);
}

function toVideoCoordinates(ocr: OcrResponse, crop: FrameCrop): OcrResponse {
	return {
		...ocr,
		words: ocr.words.map((word) => ({
			...word,
			bbox: frameRectToVideo(word.bbox, crop),
		})),
		lines: ocr.lines.map((line) => ({
			...line,
			bbox: frameRectToVideo(line.bbox, crop),
		})),
	};
}

export { useOcrLoop };
