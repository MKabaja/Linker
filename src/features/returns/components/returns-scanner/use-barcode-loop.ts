'use client';

import { type RefObject, useEffect, useEffectEvent, useRef } from 'react';
import {
	type BarcodeReader,
	createBarcodeReader,
	type DetectedCode,
} from './barcode-reader';

const MIN_INTERVAL_MS = 800;
const LOAD_FACTOR = 3;

type UseBarcodeLoopOptions = {
	videoRef: RefObject<HTMLVideoElement | null>;
	isEnabled: boolean;
	isPaused: boolean;
	onCodes: (codes: DetectedCode[]) => void;
	onDetectionTime: (milliseconds: number) => void;
};

/**
 * Pętla kodów kreskowych i 2D w wątku roboczym. Przerwa między wywołaniami to
 * `max(800 ms, 3 × czas detekcji)`, więc kody zajmują najwyżej około jednej czwartej procesora.
 * Czytnik wstaje w tle: gdy się nie uda, zostaje OCR i ręczny wpis.
 */
function useBarcodeLoop({
	videoRef,
	isEnabled,
	isPaused,
	onCodes,
	onDetectionTime,
}: UseBarcodeLoopOptions): void {
	const readerRef = useRef<BarcodeReader | null>(null);
	const handleCodes = useEffectEvent(onCodes);
	const handleDetectionTime = useEffectEvent(onDetectionTime);

	useEffect(() => {
		if (!isEnabled) {
			return;
		}
		const reader = createBarcodeReader();
		readerRef.current = reader;
		return () => {
			readerRef.current = null;
			reader.dispose();
		};
	}, [isEnabled]);

	useEffect(() => {
		if (!isEnabled || isPaused) {
			return;
		}
		let isCancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;

		async function tick() {
			const video = videoRef.current;
			const reader = readerRef.current;
			let delayMs = MIN_INTERVAL_MS;
			if (video && reader && !document.hidden) {
				const startedAt = performance.now();
				const codes = await reader.detect(video);
				const detectionMs = performance.now() - startedAt;
				if (isCancelled) {
					return;
				}
				handleDetectionTime(detectionMs);
				delayMs = Math.max(MIN_INTERVAL_MS, detectionMs * LOAD_FACTOR);
				if (codes.length > 0) {
					handleCodes(codes);
				}
			}
			timer = setTimeout(() => void tick(), delayMs);
		}

		timer = setTimeout(() => void tick(), 0);
		return () => {
			isCancelled = true;
			clearTimeout(timer);
		};
	}, [isEnabled, isPaused, videoRef]);
}

export { useBarcodeLoop };
