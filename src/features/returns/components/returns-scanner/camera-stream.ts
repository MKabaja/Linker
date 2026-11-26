const OPEN_TIMEOUT_MS = 10_000;
const CONSTRAINTS_WAIT_MS = 1_500;
const PLAY_WAIT_MS = 3_000;
const IDEAL_WIDTH_PX = 1920;
const ASPECT_RATIO = 4 / 3;

type CameraView = 'near' | 'wide';

type ZoomRange = { min: number; max: number; step: number };

type CameraAbilities = { zoom: ZoomRange | null; hasTorch: boolean };

type ExtendedConstraintSet = MediaTrackConstraintSet & {
	zoom?: number;
	torch?: boolean;
	focusMode?: string;
};

type ExtendedCapabilities = MediaTrackCapabilities & {
	zoom?: { min: number; max: number; step?: number };
	torch?: boolean;
	focusMode?: string[];
};

type CameraNumberByView = Record<CameraView, number>;

/**
 * Numery aparatów (od 1, tylne najpierw), które na telefonie testowym czytały etykiety:
 * 4 i 2. Użytkownik widzi tylko nazwę widoku.
 */
const cameraNumberByView: CameraNumberByView = { near: 4, wide: 2 };

const viewLabelByView: Record<CameraView, string> = {
	near: 'Bliżej',
	wide: 'Szerzej',
};

const viewStorageKey = 'returns.scanner.view';

/**
 * Otwiera aparat w proporcji 4:3 (1920 px; 2560 px przeciążało telefon) z ciągłym autofokusem
 * i minimalnym zoomem. Rzuca po 10 s bez odpowiedzi, a spóźniony strumień jest zamykany.
 */
async function openCameraStream(deviceId?: string): Promise<MediaStream> {
	const request = navigator.mediaDevices.getUserMedia({
		video: {
			...(deviceId
				? { deviceId: { exact: deviceId } }
				: { facingMode: { ideal: 'environment' } }),
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

	const stream = await Promise.race([request, timeout]);
	await applyInitialConstraints(stream);
	return stream;
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
 * Lista kamer z tylnymi na początku. Etykiety są dostępne dopiero po udzieleniu zgody.
 */
async function listCameras(): Promise<MediaDeviceInfo[]> {
	const devices = await navigator.mediaDevices.enumerateDevices();
	const cameras = devices.filter((device) => device.kind === 'videoinput');
	const isBack = (device: MediaDeviceInfo) =>
		/back|rear|environment|tył/i.test(device.label);
	return [...cameras.filter(isBack), ...cameras.filter((d) => !isBack(d))];
}

function hasCameraChoice(cameras: MediaDeviceInfo[]): boolean {
	return Object.values(cameraNumberByView).every(
		(cameraNumber) => cameras[cameraNumber - 1] !== undefined,
	);
}

/**
 * Wybiera kamerę dla widoku; bez obu preferowanych kamer zostaje pierwsza dostępna.
 */
function pickCameraForView(
	cameras: MediaDeviceInfo[],
	view: CameraView,
): MediaDeviceInfo | undefined {
	return hasCameraChoice(cameras)
		? cameras[cameraNumberByView[view] - 1]
		: cameras[0];
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
		hasTorch: capabilities.torch === true,
	};
}

async function applyZoom(stream: MediaStream, zoom: number): Promise<void> {
	const constraints: ExtendedConstraintSet = { zoom };
	await stream
		.getVideoTracks()[0]
		?.applyConstraints({ advanced: [constraints] })
		.catch(() => undefined);
}

async function applyTorch(stream: MediaStream, isOn: boolean): Promise<void> {
	const constraints: ExtendedConstraintSet = { torch: isOn };
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
	applyTorch,
	applyZoom,
	type CameraAbilities,
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
	viewLabelByView,
	type ZoomRange,
};
