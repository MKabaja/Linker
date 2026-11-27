import { cn } from 'cn';
import { Camera, Keyboard } from 'lucide-react';
import Link from 'next/link';
import { returnsScannerStyles } from './returns-scanner.styles';

type ScannerStartScreenProps = {
	onStart: () => void;
	onOpenManualEntry: () => void;
};

/**
 * Ekran startowy skanera na komputerze: aparat włącza się dopiero po kliknięciu,
 * żeby przeglądarka nie prosiła o zgodę od razu po wejściu na stronę.
 */
export function ScannerStartScreen({
	onStart,
	onOpenManualEntry,
}: ScannerStartScreenProps) {
	const {
		startScreen,
		startTitle,
		startHint,
		startActions,
		glassButton,
		glassButtonAccent,
	} = returnsScannerStyles;

	return (
		<div className={startScreen}>
			<h2 className={startTitle}>Skaner zwrotów</h2>
			<p className={startHint}>
				Możesz użyć kamerki internetowej albo podłączonej kamery. Przeglądarka
				zapyta o zgodę na aparat po kliknięciu.
			</p>
			<div className={startActions}>
				<button
					type="button"
					className={cn(glassButton, glassButtonAccent)}
					onClick={onStart}
				>
					<Camera aria-hidden />
					Włącz kamerę
				</button>
				<button
					type="button"
					className={glassButton}
					onClick={onOpenManualEntry}
				>
					<Keyboard aria-hidden />
					Wpisz numer
				</button>
				<Link href="/returns" className={glassButton}>
					Lista zwrotów
				</Link>
			</div>
		</div>
	);
}
