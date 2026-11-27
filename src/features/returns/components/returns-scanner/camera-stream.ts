import type { Point } from '@/features/returns/utils/scanner-geometry';
import type { CameraView } from './camera-selection';

const OPEN_TIMEOUT_MS = 10_000;
const CONSTRAINTS_WAIT_MS = 1_500;
const PLAY_WAIT_MS = 3_000;
const IDEAL_WIDTH_PX = 1920;
const ASPECT_RATIO = 4 / 3;

type ZoomRange = { min: number; max: number; step: number };

type CameraAbilities = { zoom: ZoomRange | null };

type ExtendedConstraintSet = MediaTrackConstraintSet & {
	zoom?: number;
	focusMode?: string;
	pointsOfInterest?: Point[];
};

type ExtendedCapabilities = MediaTrackCapabilities & {
	zoom?: { min: number; max: number; step?: number };
	focusMode?: string[];
};

const viewLabelByView: Record<CameraView, string> = {
	near: 'Bliżej',
	wide: 'Szerzej',
};

const viewStorageKey = 'returns.scanner.view';

/**
 * Otwiera aparat w proporcji 4:3 (1920 px; 2560 px przeciążało telefon) z ciągłym autofokusem
 * i minimalnym zoomem. Rzuca po 10 s bez odpowiedzi, a spóźniony strumień jest zamykany.
 * Gdy system podał przednią kamerę, otwiera ponownie z tylną (`exact`, a potem `ideal`).
 */
async function openCameraStream(deviceId?: string): Promise<MediaStream> {
	let stream = await requestStream(
		deviceId
			? { deviceId: { exact: deviceId } }
			: { facingMode: { ideal: 'environment' } },
	);
	if (readFacingMode(stream) === 'user') {
		stopStream(stream);
		stream = await requestRearStream();
	}
	await applyInitialConstraints(stream);
	return stream;
}

async function requestRearStream(): Promise<MediaStream> {
	try {
		return await requestStream({ facingMode: { exact: 'environment' } });
	} catch {
		return requestStream({ facingMode: { ideal: 'environment' } });
	}
}

function readFacingMode(stream: MediaStream): string | undefined {
	return stream.getVideoTracks()[0]?.getSettings().facingMode;
}

async function requestStream(
	source: MediaTrackConstraints,
): Promise<MediaStream> {
	const request = navigator.mediaDevices.getUserMedia({
		video: {
			...source,
			width: { ideal: IDEAL_WIDTH_PX },
			aspectRatio: { ideal: ASPECT_RATIO },
		},
		audio: false,
	});
	let isTimedOut = false;
	const timeout = new Promise<never>((_, reject) =>
		setTimeout(() => {
			isTimedOut = true;
			reject(new Error('Aparat nie odpowiada.'));
		}, OPEN_TIMEOUT_MS),
	);
	request
		.then((lateStream) => {
			if (isTimedOut) {
				stopStream(lateStream);
			}
		})
		.catch(() => undefined);

	return Promise.race([request, timeout]);
}

async function applyInitialConstraints(stream: MediaStream): Promise<void> {
	const [track] = stream.getVideoTracks();
	if (!track) {
		return;
	}
	const capabilities: ExtendedCapabilities = track.getCapabilities();
	const advanced: ExtendedConstraintSet[] = [];
	if (capabilities.focusMode?.includes('continuous')) {
		advanced.push({ focusMode: 'continuous' });
	}
	if (capabilities.zoom) {
		advanced.push({ zoom: capabilities.zoom.min });
	}
	if (advanced.length === 0) {
		return;
	}
	await Promise.race([
		track.applyConstraints({ advanced }).catch(() => undefined),
		new Promise((resolve) => setTimeout(resolve, CONSTRAINTS_WAIT_MS)),
	]);
}

/**
 * Podpina strumień pod `<video>` i czeka na start odtwarzania najwyżej 3 s:
 * na Androidzie `play()` potrafi nie odpowiedzieć, choć obraz już leci.
 */
async function playStream(
	video: HTMLVideoElement,
	stream: MediaStream,
): Promise<void> {
	video.srcObject = stream;
	await Promise.race([
		video.play().catch(() => undefined),
		new Promise((resolve) => setTimeout(resolve, PLAY_WAIT_MS)),
	]);
}

/**
 * Zwalnia aparat: `track.stop()` oraz `video.pause()` i `srcObject = null`.
 * Bez odpięcia wideo Android Chrome trzyma aparat i kolejny skan bywa czarny.
 */
function releaseCamera(
	stream: MediaStream | null,
	video: HTMLVideoElement | null,
): void {
	if (stream) {
		stopStream(stream);
	}
	if (video) {
		video.pause();
		video.srcObject = null;
	}
}

function stopStream(stream: MediaStream): void {
	for (const track of stream.getTracks()) {
		track.stop();
	}
}

/**
 * Lista kamer w kolejności systemu. Etykiety są dostępne dopiero po udzieleniu zgody.
 */
async function listCameras(): Promise<MediaDeviceInfo[]> {
	const devices = await navigator.mediaDevices.enumerateDevices();
	return devices.filter((device) => device.kind === 'videoinput');
}

function readCameraAbilities(stream: MediaStream): CameraAbilities {
	const [track] = stream.getVideoTracks();
	const capabilities: ExtendedCapabilities = track?.getCapabilities() ?? {};
	const { zoom } = capabilities;
	return {
		zoom:
			zoom && zoom.max > zoom.min
				? {
						min: zoom.min,
						max: zoom.max,
						step: Math.max(zoom.step ?? 0, (zoom.max - zoom.min) / 8),
					}
				: null,
	};
}

/**
 * Best-effort ostrość na punkcie (`x`, `y` znormalizowane 0–1): `pointsOfInterest` z `focusMode` `single-shot`
 * albo `manual`, tylko gdy aparat je deklaruje. Błędy są ignorowane.
 *
 * @returns `true`, gdy ustawienia wysłano i po chwili warto wrócić do `resumeContinuousFocus`.
 */
async function focusAtPoint(
	stream: MediaStream,
	point: Point,
): Promise<boolean> {
	const [track] = stream.getVideoTracks();
	const capabilities: ExtendedCapabilities = track?.getCapabilities() ?? {};
	const focusMode = ['single-shot', 'manual'].find((mode) =>
		capabilities.focusMode?.includes(mode),
	);
	if (!track || !focusMode) {
		return false;
	}
	const constraints: ExtendedConstraintSet = {
		pointsOfInterest: [point],
		focusMode,
	};
	return track
		.applyConstraints({ advanced: [constraints] })
		.then(() => true)
		.catch(() => false);
}

/**
 * Przywraca ciągły autofokus, gdy aparat go obsługuje. Błędy są ignorowane.
 */
async function resumeContinuousFocus(stream: MediaStream): Promise<void> {
	const [track] = stream.getVideoTracks();
	const capabilities: ExtendedCapabilities = track?.getCapabilities() ?? {};
	if (!track || !capabilities.focusMode?.includes('continuous')) {
		return;
	}
	const constraints: ExtendedConstraintSet = { focusMode: 'continuous' };
	await track
		.applyConstraints({ advanced: [constraints] })
		.catch(() => undefined);
}

async function applyZoom(stream: MediaStream, zoom: number): Promise<void> {
	const constraints: ExtendedConstraintSet = { zoom };
	await stream
		.getVideoTracks()[0]
		?.applyConstraints({ advanced: [constraints] })
		.catch(() => undefined);
}

function describeCameraError(error: unknown): string {
	if (!window.isSecureContext) {
		return 'Aparat działa tylko przez HTTPS (albo localhost). Otwórz adres zaczynający się od https://.';
	}
	if (error instanceof DOMException) {
		if (error.name === 'NotAllowedError') {
			return 'Brak zgody na aparat. Zezwól na aparat w ustawieniach przeglądarki albo użyj „Wpisz”.';
		}
		if (
			error.name === 'NotFoundError' ||
			error.name === 'OverconstrainedError'
		) {
			return 'Nie znaleziono aparatu. Użyj „Wpisz”, żeby podać numer ręcznie.';
		}
	}
	return `Nie udało się uruchomić aparatu${error instanceof Error ? `: ${error.message}` : '.'}`;
}

function readSavedView(): CameraView {
	try {
		return localStorage.getItem(viewStorageKey) === 'wide' ? 'wide' : 'near';
	} catch {
		return 'near';
	}
}

function saveView(view: CameraView): void {
	try {
		localStorage.setItem(viewStorageKey, view);
	} catch {
		// Brak dostępu do pamięci przeglądarki: widok nie zostanie zapamiętany.
	}
}

export {
	applyZoom,
	type CameraAbilities,
	describeCameraError,
	focusAtPoint,
	listCameras,
	openCameraStream,
	playStream,
	readCameraAbilities,
	readSavedView,
	releaseCamera,
	resumeContinuousFocus,
	saveView,
	viewLabelByView,
	type ZoomRange,
};
