'use client';

import {
	type RefObject,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from 'react';
import {
	applyTorch,
	applyZoom,
	type CameraView,
	describeCameraError,
	hasCameraChoice,
	listCameras,
	openCameraStream,
	pickCameraForView,
	playStream,
	readCameraAbilities,
	readSavedView,
	releaseCamera,
	saveView,
	type ZoomRange,
} from './camera-stream';

const WATCHDOG_INTERVAL_MS = 2_000;
const FROZEN_VIDEO_MS = 5_000;
const DEFAULT_FRAME_SIZE = { width: 4, height: 3 };

type CameraStatus =
	| { kind: 'starting' }
	| { kind: 'ready' }
	| { kind: 'error'; message: string };

type UseCameraOptions = {
	videoRef: RefObject<HTMLVideoElement | null>;
	/** Aparat jest otwarty tylko, gdy `true`; zmiana na `false` go zamyka. */
	isEnabled: boolean;
	onRestart: () => void;
	onCameraLabel: (label: string) => void;
};

type ZoomState = ZoomRange & { value: number };

type UseCameraResult = {
	status: CameraStatus;
	view: CameraView;
	canSwitchView: boolean;
	toggleView: () => void;
	zoom: ZoomState | null;
	changeZoomBy: (direction: 1 | -1) => void;
	hasTorch: boolean;
	isTorchOn: boolean;
	toggleTorch: () => void;
	/** Rozmiar klatki wideo w pikselach (do przeliczenia ramek na ekran). */
	frameSize: { width: number; height: number };
	/** Ponowne otwarcie aparatu bez przeładowania strony. */
	retry: () => void;
	/** Zamyka aparat od razu (przed zapisem zwrotu), nie czekając na kolejny render. */
	close: () => void;
};

/**
 * Otwiera aparat dla wybranego widoku (kamery 4 albo 2 z listy, wybór zapamiętany w `localStorage`),
 * pilnuje go strażnikiem co 2 s (zakończona ścieżka, zatrzymane wideo, obraz stojący ponad 5 s
 * to ponowne otwarcie) i obsługuje zoom oraz latarkę. Każde czekanie na przeglądarkę ma limit czasu.
 */
function useCamera({
	videoRef,
	isEnabled,
	onRestart,
	onCameraLabel,
}: UseCameraOptions): UseCameraResult {
	const [status, setStatus] = useState<CameraStatus>({ kind: 'starting' });
	const [view, setView] = useState<CameraView>(readSavedView);
	const [hasChoice, setHasChoice] = useState(false);
	const [zoom, setZoom] = useState<ZoomState | null>(null);
	const [hasTorch, setHasTorch] = useState(false);
	const [isTorchOn, setIsTorchOn] = useState(false);
	const [frameSize, setFrameSize] = useState(DEFAULT_FRAME_SIZE);
	const [attempt, setAttempt] = useState(0);
	const streamRef = useRef<MediaStream | null>(null);
	const isClosedRef = useRef(false);
	const notifyRestart = useEffectEvent(onRestart);
	const notifyCameraLabel = useEffectEvent(onCameraLabel);

	useEffect(() => {
		const video = videoRef.current;
		if (!isEnabled || !video) {
			return;
		}
		isClosedRef.current = false;
		let isCancelled = false;
		let isRestarting = false;
		let deviceId: string | undefined;
		const clock = { time: -1, changedAt: 0 };

		async function attach(): Promise<void> {
			releaseCamera(streamRef.current, null);
			streamRef.current = null;
			const stream = await openCameraStream(deviceId);
			if (isCancelled || isClosedRef.current) {
				releaseCamera(stream, null);
				return;
			}
			streamRef.current = stream;
			await playStream(video as HTMLVideoElement, stream);
			const abilities = readCameraAbilities(stream);
			setZoom(
				abilities.zoom
					? { ...abilities.zoom, value: abilities.zoom.min }
					: null,
			);
			setHasTorch(abilities.hasTorch);
			setIsTorchOn(false);
			setFrameSize({
				width: video?.videoWidth || DEFAULT_FRAME_SIZE.width,
				height: video?.videoHeight || DEFAULT_FRAME_SIZE.height,
			});
			clock.changedAt = Date.now();
			notifyCameraLabel(stream.getVideoTracks()[0]?.label ?? '');
		}

		async function resolveDeviceId(): Promise<string | undefined> {
			let cameras = await listCameras();
			const isRetry = attempt > 0;
			if (isRetry || cameras.length === 0 || !cameras[0]?.label) {
				const probe = await openCameraStream();
				releaseCamera(probe, null);
				cameras = await listCameras();
			}
			setHasChoice(hasCameraChoice(cameras));
			return pickCameraForView(cameras, view)?.deviceId;
		}

		async function start(): Promise<void> {
			try {
				deviceId = await resolveDeviceId();
				if (isCancelled) {
					return;
				}
				await attach();
				if (!isCancelled && streamRef.current) {
					setStatus({ kind: 'ready' });
				}
			} catch (error) {
				releaseCamera(streamRef.current, video);
				streamRef.current = null;
				if (!isCancelled) {
					setStatus({ kind: 'error', message: describeCameraError(error) });
				}
			}
		}

		async function checkCamera(): Promise<void> {
			const stream = streamRef.current;
			if (isCancelled || isClosedRef.current || isRestarting || !stream) {
				return;
			}
			if (document.hidden) {
				return;
			}
			if (video && video.currentTime !== clock.time) {
				clock.time = video.currentTime;
				clock.changedAt = Date.now();
			}
			const track = stream.getVideoTracks()[0];
			const isEnded = !track || track.readyState === 'ended';
			const isFrozen = Date.now() - clock.changedAt > FROZEN_VIDEO_MS;
			if (!isEnded && !isFrozen && !video?.paused) {
				return;
			}
			isRestarting = true;
			notifyRestart();
			try {
				await attach();
			} catch {
				// Kolejna próba przy następnym sprawdzeniu.
			} finally {
				isRestarting = false;
			}
		}

		void start();
		const watchdog = setInterval(
			() => void checkCamera(),
			WATCHDOG_INTERVAL_MS,
		);
		return () => {
			isCancelled = true;
			clearInterval(watchdog);
			releaseCamera(streamRef.current, video);
			streamRef.current = null;
		};
	}, [isEnabled, view, attempt, videoRef]);

	function toggleView() {
		const nextView = view === 'near' ? 'wide' : 'near';
		saveView(nextView);
		setStatus({ kind: 'starting' });
		setView(nextView);
	}

	function retry() {
		setStatus({ kind: 'starting' });
		setAttempt((current) => current + 1);
	}

	function close() {
		isClosedRef.current = true;
		releaseCamera(streamRef.current, videoRef.current);
		streamRef.current = null;
	}

	function changeZoomBy(direction: 1 | -1) {
		const stream = streamRef.current;
		if (!zoom || !stream) {
			return;
		}
		const value = Math.min(
			zoom.max,
			Math.max(zoom.min, zoom.value + direction * zoom.step),
		);
		setZoom({ ...zoom, value });
		void applyZoom(stream, value);
	}

	function toggleTorch() {
		const stream = streamRef.current;
		if (!stream) {
			return;
		}
		const nextIsOn = !isTorchOn;
		setIsTorchOn(nextIsOn);
		void applyTorch(stream, nextIsOn);
	}

	return {
		status,
		view,
		canSwitchView: hasChoice,
		toggleView,
		zoom,
		changeZoomBy,
		hasTorch,
		isTorchOn,
		toggleTorch,
		frameSize,
		retry,
		close,
	};
}

export { type CameraStatus, type UseCameraResult, useCamera };
