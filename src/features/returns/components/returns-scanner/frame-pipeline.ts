import type { Rect } from '@/features/returns/model/traces.types';
import type { FrameCrop } from '@/features/returns/utils/scanner-geometry';
import type { GateResult } from './frame-gate';
import { createWorkerClient } from './worker-client';

const GATE_WIDTH_PX = 160;
const OCR_FRAME_WIDTH_PX = 1280;
const STRIP_UPSCALE = 2;
const TARGET_UPSCALE = 2;
const TARGET_FRAME_MAX_SIDE_PX = 2048;
const MIN_REGION_WIDTH_PX = 40;
const MIN_REGION_HEIGHT_PX = 16;
const TASK_TIMEOUT_MS = 3_000;

type FrameRequest =
	| { id: number; type: 'reset' }
	| { id: number; type: 'gate'; bitmap: ImageBitmap }
	| { id: number; type: 'encode'; bitmap: ImageBitmap };

type CapturedFrame = FrameCrop & { blob: Blob; isStrip: boolean };

type FramePipeline = {
	reset: () => void;
	/** Ostrość i ruch na miniaturze 160 px; `null`, gdy wideo nie ma jeszcze klatki. */
	measure: (video: HTMLVideoElement) => Promise<GateResult | null>;
	/**
	 * Cała klatka (maks. 1280 px) albo wycinek `region` w układzie wideo (powiększony 2×), jako JPEG q 0,75.
	 * Zwraca `null`, gdy wideo nie ma klatki albo wycinek jest za mały.
	 */
	capture: (
		video: HTMLVideoElement,
		region?: Rect,
	) => Promise<CapturedFrame | null>;
	/**
	 * Wycinek wokół tapniętego celu w wyższej rozdzielczości niż zwykła klatka (do 2× i maks. 2048 px na boku).
	 * Czytany jak pełna klatka (`isStrip: false`); `null` jak w `capture`.
	 */
	captureTarget: (
		video: HTMLVideoElement,
		region: Rect,
	) => Promise<CapturedFrame | null>;
	dispose: () => void;
};

type VideoSize = { videoWidth: number; videoHeight: number };

type EncodeAreaInput = { area: Rect; scale: number };

/**
 * Obróbka klatek poza głównym wątkiem (`frame.worker.ts`): bramka ostrości i ruchu oraz kodowanie JPEG.
 * Strona robi tylko asynchroniczny `createImageBitmap` już zmniejszony do docelowego rozmiaru.
 */
function createFramePipeline(): FramePipeline {
	const client = createWorkerClient(
		() =>
			new Worker(new URL('./frame.worker.ts', import.meta.url), {
				type: 'module',
			}),
	);

	function reset(): void {
		client
			.call({ type: 'reset' }, { timeoutMs: TASK_TIMEOUT_MS, isValue: isTrue })
			.catch(() => undefined);
	}

	async function measure(video: HTMLVideoElement) {
		if (!video.videoWidth) {
			return null;
		}
		const height = Math.round(
			(video.videoHeight / video.videoWidth) * GATE_WIDTH_PX,
		);
		const bitmap = await createImageBitmap(video, {
			resizeWidth: GATE_WIDTH_PX,
			resizeHeight: height,
			resizeQuality: 'medium',
		});
		return client
			.call(
				{ type: 'gate', bitmap },
				{
					timeoutMs: TASK_TIMEOUT_MS,
					isValue: isGateResult,
					transfer: [bitmap],
				},
			)
			.catch((error: unknown) => {
				bitmap.close();
				throw error;
			});
	}

	async function capture(video: HTMLVideoElement, region?: Rect) {
		if (!video.videoWidth) {
			return null;
		}
		const area = region
			? clampRegion(region, video)
			: { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight };
		if (!area) {
			return null;
		}
		const scale = Math.min(
			region ? STRIP_UPSCALE : 1,
			OCR_FRAME_WIDTH_PX / area.width,
		);
		const frame = await encodeArea(video, { area, scale });
		return { ...frame, isStrip: region !== undefined };
	}

	async function captureTarget(video: HTMLVideoElement, region: Rect) {
		const area = video.videoWidth ? clampRegion(region, video) : null;
		if (!area) {
			return null;
		}
		const scale = Math.min(
			TARGET_UPSCALE,
			TARGET_FRAME_MAX_SIDE_PX / area.width,
			TARGET_FRAME_MAX_SIDE_PX / area.height,
		);
		const frame = await encodeArea(video, { area, scale });
		return { ...frame, isStrip: false };
	}

	async function encodeArea(
		video: HTMLVideoElement,
		{ area, scale }: EncodeAreaInput,
	): Promise<FrameCrop & { blob: Blob }> {
		const bitmap = await createImageBitmap(
			video,
			area.x,
			area.y,
			area.width,
			area.height,
			{
				resizeWidth: Math.round(area.width * scale),
				resizeHeight: Math.round(area.height * scale),
				resizeQuality: 'high',
			},
		);
		const blob = await client
			.call(
				{ type: 'encode', bitmap },
				{ timeoutMs: TASK_TIMEOUT_MS, isValue: isBlob, transfer: [bitmap] },
			)
			.catch((error: unknown) => {
				bitmap.close();
				throw error;
			});
		return { blob, scale, offsetX: area.x, offsetY: area.y };
	}

	return {
		reset,
		measure,
		capture,
		captureTarget,
		dispose: client.dispose,
	};
}

function clampRegion(
	region: Rect,
	{ videoWidth, videoHeight }: VideoSize,
): Rect | null {
	const x = Math.max(0, Math.round(region.x));
	const y = Math.max(0, Math.round(region.y));
	const width = Math.min(videoWidth - x, Math.round(region.width));
	const height = Math.min(videoHeight - y, Math.round(region.height));
	return width < MIN_REGION_WIDTH_PX || height < MIN_REGION_HEIGHT_PX
		? null
		: { x, y, width, height };
}

function isTrue(value: unknown): value is true {
	return value === true;
}

function isBlob(value: unknown): value is Blob {
	return value instanceof Blob;
}

function isGateResult(value: unknown): value is GateResult {
	return (
		typeof value === 'object' &&
		value !== null &&
		'isReady' in value &&
		typeof value.isReady === 'boolean'
	);
}

export {
	type CapturedFrame,
	createFramePipeline,
	type FramePipeline,
	type FrameRequest,
};
