import type { Rect } from '@/features/returns/model/traces.types';
import { createWorkerClient } from './worker-client';

const DETECT_TIMEOUT_MS = 3_000;
const START_TIMEOUT_MS = 15_000;

type DetectedCode = { value: string; bbox: Rect | undefined };

type BarcodeReader = {
	/** Zwraca pustą listę, gdy wideo nie ma jeszcze klatki albo wątek zawiódł (zostaje OCR i „Wpisz”). */
	detect: (video: HTMLVideoElement) => Promise<DetectedCode[]>;
	dispose: () => void;
};

/**
 * Czytnik kodów w osobnym wątku (`barcode.worker.ts`). Strona robi tylko asynchroniczny zrzut klatki;
 * pierwsze wywołanie w nowym wątku przygotowuje silnik (WASM), więc dostaje dłuższy limit czasu.
 */
function createBarcodeReader(): BarcodeReader {
	const client = createWorkerClient(
		() =>
			new Worker(new URL('./barcode.worker.ts', import.meta.url), {
				type: 'module',
			}),
	);
	let isReady = false;

	async function detect(video: HTMLVideoElement): Promise<DetectedCode[]> {
		if (!video.videoWidth) {
			return [];
		}
		let bitmap: ImageBitmap | null = null;
		try {
			bitmap = await createImageBitmap(video);
			const codes = await client.call(
				{ type: 'detect', bitmap },
				{
					timeoutMs: isReady ? DETECT_TIMEOUT_MS : START_TIMEOUT_MS,
					isValue: isDetectedCodes,
					transfer: [bitmap],
				},
			);
			isReady = true;
			return codes;
		} catch {
			bitmap?.close();
			isReady = false;
			return [];
		}
	}

	return { detect, dispose: client.dispose };
}

function isDetectedCodes(value: unknown): value is DetectedCode[] {
	return (
		Array.isArray(value) &&
		value.every((code) => typeof code?.value === 'string')
	);
}

export { type BarcodeReader, createBarcodeReader, type DetectedCode };
