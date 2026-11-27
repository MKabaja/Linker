type CameraStart = 'unknown' | 'waiting' | 'allowed';

type CameraStartInput = {
	isCoarsePointer: boolean | null;
	isStartRequested: boolean;
};

/**
 * Decyduje, czy skaner może otworzyć aparat: telefon (`pointer: coarse`) od razu,
 * komputer dopiero po kliknięciu użytkownika. `unknown` oznacza, że rodzaj wskaźnika
 * nie został jeszcze odczytany w przeglądarce.
 */
export function decideCameraStart({
	isCoarsePointer,
	isStartRequested,
}: CameraStartInput): CameraStart {
	if (isStartRequested) {
		return 'allowed';
	}
	if (isCoarsePointer === null) {
		return 'unknown';
	}
	return isCoarsePointer ? 'allowed' : 'waiting';
}

export type { CameraStart };
