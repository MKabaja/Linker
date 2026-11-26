import { useElementSize } from '@/shared/hooks/use-element-size';
import type { Rect, TraceEntry } from '@/features/returns/model/traces.types';
import {
	mapRectToCover,
	type Size,
} from '@/features/returns/utils/scanner-geometry';
import {
	boxStyleByTraceState,
	returnsScannerStyles,
} from './returns-scanner.styles';

const BOX_TTL_MS = 1_500;
const BOX_PADDING_RATIO = 0.012;
const IDLE_RETICLE_WIDTH_RATIO = 0.62;
const IDLE_RETICLE_HEIGHT_RATIO = 0.42;

type ScannerOverlayProps = {
	entries: TraceEntry[];
	frameSize: Size;
	nowMs: number;
};

/**
 * Celownik i ramki odczytów na podglądzie. Ramki z układu klatki są przeliczane na układ ekranu
 * przy `object-fit: cover`; znikają, gdy trop nie był widziany od 1,5 s.
 */
export function ScannerOverlay({
	entries,
	frameSize,
	nowMs,
}: ScannerOverlayProps) {
	const { ref, size } = useElementSize<HTMLDivElement>();
	const { overlay, box, reticle } = returnsScannerStyles;

	const visibleBoxes = entries.flatMap((entry) => {
		if (!entry.bbox || nowMs - entry.seenAt >= BOX_TTL_MS) {
			return [];
		}
		const rect = mapRectToCover({
			rect: padRect(entry.bbox, frameSize),
			frame: frameSize,
			container: size,
		});
		return rect ? [{ entry, rect }] : [];
	});
	const active = visibleBoxes.reduce<(typeof visibleBoxes)[number] | null>(
		(latest, current) =>
			!latest || current.entry.seenAt >= latest.entry.seenAt ? current : latest,
		null,
	);
	const idleRect = {
		x: (size.width * (1 - IDLE_RETICLE_WIDTH_RATIO)) / 2,
		y: (size.height * (1 - IDLE_RETICLE_HEIGHT_RATIO)) / 2,
		width: size.width * IDLE_RETICLE_WIDTH_RATIO,
		height: size.height * IDLE_RETICLE_HEIGHT_RATIO,
	};

	return (
		<div ref={ref} className={overlay} aria-hidden>
			{visibleBoxes
				.filter(({ entry }) => entry.id !== active?.entry.id)
				.map(({ entry, rect }) => (
					<div
						key={entry.id}
						className={`${box} ${boxStyleByTraceState[entry.state]}`}
						style={toStyle(rect)}
					/>
				))}
			<div
				className={`${reticle} ${active ? boxStyleByTraceState[active.entry.state] : 'border-white/40'}`}
				style={toStyle(active?.rect ?? idleRect)}
			/>
		</div>
	);
}

function padRect(rect: Rect, frame: Size): Rect {
	const padding = frame.width * BOX_PADDING_RATIO;
	return {
		x: rect.x - padding,
		y: rect.y - padding,
		width: rect.width + padding * 2,
		height: rect.height + padding * 2,
	};
}

function toStyle({ x, y, width, height }: Rect) {
	return { left: x, top: y, width, height };
}
