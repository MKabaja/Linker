import 'server-only';
import {
	OCR_QUEUE_MAX_RUNNING,
	OCR_QUEUE_MAX_WAITING,
} from '@/features/returns/server/sources/ocr.config';

type DroppedStatus = 'superseded' | 'aborted';
type SlotOutcome = 'start' | 'busy' | DroppedStatus;
type QueueOutcome<T> =
	| { status: 'done'; value: T }
	| { status: 'busy' }
	| { status: DroppedStatus };
type OcrJob<T> = {
	scanSession: string;
	signal: AbortSignal;
	run: () => Promise<T>;
};
type WaitingFrame = {
	scanSession: string;
	start: () => void;
	drop: (status: DroppedStatus) => void;
};
type QueueState = { runningCount: number; waiting: WaitingFrame[] };

const queueStore = globalThis as typeof globalThis & {
	linkerOcrQueue?: QueueState;
};
queueStore.linkerOcrQueue ??= { runningCount: 0, waiting: [] };
const queue = queueStore.linkerOcrQueue;

/**
 * Uruchamia zadanie OCR w kolejce bez zatorów: najwyżej 2 naraz i 4 czekające.
 *
 * @returns
 * `busy`, gdy kolejka jest pełna; `superseded`, gdy z tego samego skanu przyszła nowsza klatka;
 * `aborted`, gdy klient przerwał żądanie, zanim zadanie ruszyło.
 * @remarks Wyjątek z `run` przechodzi do wołającego, a miejsce w kolejce zostaje zwolnione.
 */
async function runInOcrQueue<T>(job: OcrJob<T>): Promise<QueueOutcome<T>> {
	if (job.signal.aborted) {
		return { status: 'aborted' };
	}
	if (queue.runningCount < OCR_QUEUE_MAX_RUNNING) {
		queue.runningCount += 1;
	} else {
		const slot = await waitForSlot(job.scanSession, job.signal);
		if (slot !== 'start') {
			return { status: slot };
		}
	}
	try {
		return { status: 'done', value: await job.run() };
	} finally {
		releaseSlot();
	}
}

function waitForSlot(
	scanSession: string,
	signal: AbortSignal,
): Promise<SlotOutcome> {
	dropOlderFrames(scanSession);
	if (queue.waiting.length >= OCR_QUEUE_MAX_WAITING) {
		return Promise.resolve('busy');
	}
	return new Promise((resolve) => {
		const onAbort = () => {
			removeWaiting(frame);
			frame.drop('aborted');
		};
		const frame: WaitingFrame = {
			scanSession,
			start: () => {
				signal.removeEventListener('abort', onAbort);
				resolve('start');
			},
			drop: (status) => {
				signal.removeEventListener('abort', onAbort);
				resolve(status);
			},
		};
		signal.addEventListener('abort', onAbort, { once: true });
		queue.waiting.push(frame);
	});
}

function dropOlderFrames(scanSession: string): void {
	const olderFrames = queue.waiting.filter(
		(frame) => frame.scanSession === scanSession,
	);
	for (const frame of olderFrames) {
		removeWaiting(frame);
		frame.drop('superseded');
	}
}

function releaseSlot(): void {
	const nextFrame = queue.waiting.shift();
	if (nextFrame) {
		nextFrame.start();
		return;
	}
	queue.runningCount -= 1;
}

function removeWaiting(frame: WaitingFrame): void {
	const index = queue.waiting.indexOf(frame);
	if (index >= 0) {
		queue.waiting.splice(index, 1);
	}
}

export { type QueueOutcome, runInOcrQueue };
