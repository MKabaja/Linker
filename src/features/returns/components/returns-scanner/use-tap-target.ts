'use client';

import { type PointerEvent, useState } from 'react';
import type { Rect } from '@/features/returns/model/traces.types';
import { isTapTargetActive } from '@/features/returns/utils/scan-plan';
import {
	mapPointFromCover,
	type Point,
	pickNearestToPoint,
} from '@/features/returns/utils/scanner-geometry';

const PRIMARY_BUTTON = 0;

/** Tapnięty cel w układzie klatki wideo. */
type TapTarget = { point: Point; tappedAtMs: number };

type UseTapTargetOptions = {
	onAim: (target: TapTarget) => void;
};

type UseTapTargetResult = {
	target: TapTarget | null;
	aimFromPointer: (event: PointerEvent<HTMLVideoElement>) => void;
	/** Przy aktywnym celu z kilku kodów zostawia ten najbliżej punktu; inaczej zwraca listę bez zmian. */
	preferAimed: <Located extends { bbox?: Rect }>(codes: Located[]) => Located[];
};

/**
 * „Tapnij, żeby wycelować”: punkt dotknięcia podglądu (`object-fit: cover`) przeliczony na układ klatki wideo.
 * Tapnięcie poza klatką albo innym niż główny wskaźnikiem jest ignorowane.
 */
function useTapTarget({ onAim }: UseTapTargetOptions): UseTapTargetResult {
	const [target, setTarget] = useState<TapTarget | null>(null);

	function aimFromPointer(event: PointerEvent<HTMLVideoElement>) {
		if (!event.isPrimary || event.button !== PRIMARY_BUTTON) {
			return;
		}
		const video = event.currentTarget;
		const { left, top, width, height } = video.getBoundingClientRect();
		const point = mapPointFromCover({
			point: { x: event.clientX - left, y: event.clientY - top },
			frame: { width: video.videoWidth, height: video.videoHeight },
			container: { width, height },
		});
		if (!point) {
			return;
		}
		const nextTarget = { point, tappedAtMs: Date.now() };
		setTarget(nextTarget);
		onAim(nextTarget);
	}

	function preferAimed<Located extends { bbox?: Rect }>(codes: Located[]) {
		if (
			codes.length < 2 ||
			!target ||
			!isTapTargetActive(target.tappedAtMs, Date.now())
		) {
			return codes;
		}
		const nearest = pickNearestToPoint(codes, target.point);
		return nearest ? [nearest] : codes;
	}

	return { target, aimFromPointer, preferAimed };
}

export { type TapTarget, useTapTarget };
