import { cn } from 'cn';
import {
	Flashlight,
	FlashlightOff,
	Keyboard,
	SwitchCamera,
	X,
	ZoomIn,
	ZoomOut,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { UseCameraResult } from './use-camera';
import {
	type Carrier,
	carrierLabelByCarrier,
} from '@/features/returns/utils/carrier';
import { viewLabelByView } from './camera-stream';
import {
	carrierBadgeVariants,
	returnsScannerStyles,
} from './returns-scanner.styles';

type ScannerControlsProps = {
	camera: UseCameraResult;
	statusText: string;
	isLive: boolean;
	carrier: Carrier | null;
	onOpenManualEntry: () => void;
	children: ReactNode;
};

/**
 * Przyciski nałożone na podgląd: zamknięcie i status u góry, zoom z boku, widok, latarka i „Wpisz” na dole.
 */
export function ScannerControls({
	camera,
	statusText,
	isLive,
	carrier,
	onOpenManualEntry,
	children,
}: ScannerControlsProps) {
	const {
		topBar,
		statusPill,
		statusDot,
		statusText: statusTextStyle,
		visuallyHidden,
		glassButton,
		glassButtonStacked,
		zoomGroup,
		actions,
		bottomBar,
	} = returnsScannerStyles;
	const { zoom } = camera;
	const stackedButton = cn(glassButton, glassButtonStacked);

	return (
		<>
			<div className={topBar}>
				<Link
					href="/returns"
					className={glassButton}
					aria-label="Zamknij skaner"
				>
					<X aria-hidden />
				</Link>
				<p className={statusPill} role="status">
					<span className={statusTextStyle}>
						{isLive && <span className={statusDot} aria-hidden />}
						{statusText}
					</span>
					{carrier && (
						<span className={carrierBadgeVariants({ carrier })}>
							<span className={visuallyHidden}>Przewoźnik: </span>
							{carrierLabelByCarrier[carrier]}
						</span>
					)}
				</p>
				<span className="size-12" aria-hidden />
			</div>

			{zoom && (
				<div className={zoomGroup}>
					<button
						type="button"
						className={glassButton}
						onClick={() => camera.changeZoomBy(1)}
						disabled={zoom.value >= zoom.max}
						aria-label="Przybliż"
					>
						<ZoomIn aria-hidden />
					</button>
					<button
						type="button"
						className={glassButton}
						onClick={() => camera.changeZoomBy(-1)}
						disabled={zoom.value <= zoom.min}
						aria-label="Oddal"
					>
						<ZoomOut aria-hidden />
					</button>
				</div>
			)}

			<div className={bottomBar}>
				{children}
				<div className={actions}>
					{camera.canSwitchView ? (
						<button
							type="button"
							className={stackedButton}
							onClick={camera.toggleView}
							aria-label={`Widok: ${viewLabelByView[camera.view]}. Przełącz widok`}
						>
							<SwitchCamera aria-hidden />
							<span>Widok</span>
							<span className="text-off">{viewLabelByView[camera.view]}</span>
						</button>
					) : (
						<span aria-hidden />
					)}
					{camera.hasTorch ? (
						<button
							type="button"
							className={stackedButton}
							onClick={camera.toggleTorch}
							aria-pressed={camera.isTorchOn}
						>
							{camera.isTorchOn ? (
								<Flashlight aria-hidden />
							) : (
								<FlashlightOff aria-hidden />
							)}
							<span>Latarka</span>
						</button>
					) : (
						<span aria-hidden />
					)}
					<button
						type="button"
						className={stackedButton}
						onClick={onOpenManualEntry}
					>
						<Keyboard aria-hidden />
						<span>Wpisz</span>
					</button>
				</div>
			</div>
		</>
	);
}
