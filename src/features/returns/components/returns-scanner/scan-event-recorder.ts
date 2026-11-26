import type { ClientEvent } from '@/features/returns/model/event-log.schemas';
import type { ClientEventFields } from '@/features/returns/model/event-log.types';
import { appendEvent, takeBatch } from './scan-event-buffer';

const EVENTS_URL = '/api/returns/events';
const IDLE_FLUSH_DELAY_MS = 5_000;
const IDLE_CALLBACK_TIMEOUT_MS = 10_000;

type RecorderState = {
	buffer: ClientEvent[];
	activeScanIds: Set<string>;
	isSending: boolean;
	isListening: boolean;
	flushTimer: ReturnType<typeof setTimeout> | undefined;
};

const state: RecorderState = {
	buffer: [],
	activeScanIds: new Set(),
	isSending: false,
	isListening: false,
	flushTimer: undefined,
};

/**
 * Zapisuje zdarzenie skanu w buforze w pamięci (maks. 500, najstarsze odpadają). Nic nie wysyła w trakcie skanu.
 *
 * @remarks
 * Gdy żaden skan nie trwa, bufor jest wysyłany po 5 s bezczynności (w `requestIdleCallback`).
 * Wysyłka jest też po `endScan` oraz przy `pagehide` i ukryciu karty (`sendBeacon`).
 */
function recordScanEvent(scanId: string, fields: ClientEventFields): void {
	listenForPageHide();
	state.buffer = appendEvent(state.buffer, {
		...fields,
		scanId,
		clientAt: Date.now(),
	});
	scheduleFlush(IDLE_FLUSH_DELAY_MS);
}

/**
 * Oznacza skan jako trwający: do jego końca zdarzenia nie są wysyłane (poza ukryciem strony).
 */
function beginScan(scanId: string): void {
	state.activeScanIds.add(scanId);
	clearTimeout(state.flushTimer);
}

/**
 * Kończy skan i planuje wysyłkę bufora na chwilę bezczynności przeglądarki. Wielokrotne wywołanie jest bezpieczne.
 */
function endScan(scanId: string): void {
	state.activeScanIds.delete(scanId);
	scheduleFlush(0);
}

function scheduleFlush(delayMs: number): void {
	clearTimeout(state.flushTimer);
	if (state.activeScanIds.size > 0 || state.buffer.length === 0) {
		return;
	}
	state.flushTimer = setTimeout(
		() => runWhenIdle(() => void sendBufferedEvents()),
		delayMs,
	);
}

function runWhenIdle(task: () => void): void {
	if (typeof requestIdleCallback === 'function') {
		requestIdleCallback(task, { timeout: IDLE_CALLBACK_TIMEOUT_MS });
		return;
	}
	setTimeout(task, 0);
}

async function sendBufferedEvents(): Promise<void> {
	if (state.isSending) {
		return;
	}
	state.isSending = true;
	try {
		while (state.buffer.length > 0 && state.activeScanIds.size === 0) {
			const { batch, rest } = takeBatch(state.buffer);
			state.buffer = rest;
			await postBatch(batch);
		}
	} finally {
		state.isSending = false;
	}
}

async function postBatch(batch: ClientEvent[]): Promise<void> {
	try {
		await fetch(EVENTS_URL, {
			method: 'POST',
			body: JSON.stringify({ events: batch }),
		});
	} catch {
		// Dziennik jest pomocniczy: utracona paczka nie może przeszkadzać w pracy.
	}
}

function beaconAllEvents(): void {
	while (state.buffer.length > 0) {
		const { batch, rest } = takeBatch(state.buffer);
		state.buffer = rest;
		navigator.sendBeacon(
			EVENTS_URL,
			new Blob([JSON.stringify({ events: batch })], {
				type: 'application/json',
			}),
		);
	}
}

function listenForPageHide(): void {
	if (state.isListening) {
		return;
	}
	state.isListening = true;
	addEventListener('pagehide', beaconAllEvents);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') {
			beaconAllEvents();
		}
	});
}

export { beginScan, endScan, recordScanEvent };
