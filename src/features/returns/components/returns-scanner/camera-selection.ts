type CameraCandidate = { deviceId: string; label: string };

type CameraView = 'near' | 'wide';

type CameraSelection = {
	deviceId: string | undefined;
	canSwitchView: boolean;
};

type CameraFacing = 'back' | 'front' | 'unknown';

type CameraNumberByView = Record<CameraView, number>;

/**
 * Numery aparatów (od 1, na liście tylne najpierw), które na telefonie testowym czytały etykiety:
 * 4 i 2. Obowiązują tylko, gdy tam leżą tylne aparaty.
 */
const preferredCameraNumberByView: CameraNumberByView = { near: 4, wide: 2 };

const FRONT_LABEL = /front|user|przedni|selfie/i;
const BACK_LABEL = /back|rear|environment|tyl|tył/i;

/**
 * Wybiera aparat dla widoku spośród tylnych (po etykiecie) i mówi, czy przełącznik widoku ma sens.
 * Bez dwóch tylnych aparatów przełącznik jest zbędny; bez etykiet zostaje pierwszy aparat.
 */
function selectCamera(
	cameras: CameraCandidate[],
	view: CameraView,
): CameraSelection {
	const backCameras = cameras.filter(
		(camera) => detectFacing(camera) === 'back',
	);

	if (backCameras.length < 2) {
		const fallback =
			backCameras[0] ??
			cameras.find((camera) => detectFacing(camera) !== 'front') ??
			cameras[0];
		return { deviceId: fallback?.deviceId, canSwitchView: false };
	}
	const wide = pickBackCamera(cameras, backCameras, 'wide', undefined);
	if (view === 'wide') {
		return { deviceId: wide?.deviceId, canSwitchView: true };
	}
	const near = pickBackCamera(cameras, backCameras, 'near', wide);
	return { deviceId: near?.deviceId, canSwitchView: true };
}

function pickBackCamera(
	cameras: CameraCandidate[],
	backCameras: CameraCandidate[],
	view: CameraView,
	excluded: CameraCandidate | undefined,
): CameraCandidate | undefined {
	const preferred =
		orderBackFirst(cameras)[preferredCameraNumberByView[view] - 1];
	if (
		preferred &&
		preferred !== excluded &&
		detectFacing(preferred) === 'back'
	) {
		return preferred;
	}
	const candidates = backCameras.filter((camera) => camera !== excluded);
	return view === 'wide' ? candidates[0] : candidates.at(-1);
}

function orderBackFirst(cameras: CameraCandidate[]): CameraCandidate[] {
	return [
		...cameras.filter((camera) => detectFacing(camera) === 'back'),
		...cameras.filter((camera) => detectFacing(camera) !== 'back'),
	];
}

function detectFacing({ label }: CameraCandidate): CameraFacing {
	if (FRONT_LABEL.test(label)) {
		return 'front';
	}
	return BACK_LABEL.test(label) ? 'back' : 'unknown';
}

export {
	type CameraCandidate,
	type CameraSelection,
	type CameraView,
	selectCamera,
};
