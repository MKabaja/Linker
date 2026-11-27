import { useState } from 'react';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/shared/components/sheet';
import { usePendingReturns } from './use-pending-returns';
import type { PendingReturnView } from '@/features/returns/model/typed-number.types';
import {
	carrierLabelByCarrier,
	detectCarrier,
} from '@/features/returns/utils/carrier';
import { shortenNumber } from '@/features/returns/utils/trace-format';
import { formatWarsawDateTime } from '@/shared/lib/warsaw-time';
import {
	carrierBadgeVariants,
	scannerSheetStyles,
} from './returns-scanner.styles';

type ScannerPendingReturnsSheetProps = {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onPick: (pendingReturn: PendingReturnView) => void;
};

type PendingReturnsListProps = Pick<
	ScannerPendingReturnsSheetProps,
	'onPick'
> & {
	onRetry: () => void;
};

/**
 * Wyjście awaryjne: zwroty z modułu zwrotów BaseLinkera z ostatnich 45 dni, które czekają na przyjęcie.
 * Wybór zapisuje zwrot dla zamówienia tego zwrotu. Lista jest pobierana przy każdym otwarciu panelu.
 */
export function ScannerPendingReturnsSheet({
	isOpen,
	onOpenChange,
	onPick,
}: ScannerPendingReturnsSheetProps) {
	const [attempt, setAttempt] = useState(0);

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className={scannerSheetStyles.content}>
				<SheetHeader>
					<SheetTitle>Oczekujące zwroty</SheetTitle>
					<SheetDescription>
						Zwroty z BaseLinkera z ostatnich 45 dni, bez przyjęcia.
					</SheetDescription>
				</SheetHeader>
				<PendingReturnsList
					key={attempt}
					onPick={onPick}
					onRetry={() => setAttempt((current) => current + 1)}
				/>
			</SheetContent>
		</Sheet>
	);
}

function PendingReturnsList({ onPick, onRetry }: PendingReturnsListProps) {
	const state = usePendingReturns();
	const {
		list,
		candidate,
		candidateHeader,
		candidateId,
		candidateBits,
		candidateNumberRow,
		candidateMeta,
		candidateProducts,
		sheetNote,
		sheetRetry,
	} = scannerSheetStyles;

	if (state.status === 'loading') {
		return (
			<p className={sheetNote} role="status">
				Wczytuję zwroty…
			</p>
		);
	}

	if (state.status === 'error') {
		return (
			<>
				<p className={sheetNote} role="alert">
					Nie udało się wczytać zwrotów.
				</p>
				<button type="button" className={sheetRetry} onClick={onRetry}>
					Spróbuj ponownie
				</button>
			</>
		);
	}

	if (state.returns.length === 0) {
		return <p className={sheetNote}>Brak oczekujących zwrotów.</p>;
	}

	return (
		<div className={list}>
			{state.returns.map((pendingReturn) => {
				const carrier = detectCarrier(pendingReturn.packageNumber);

				return (
					<button
						key={pendingReturn.returnId}
						type="button"
						className={candidate}
						onClick={() => onPick(pendingReturn)}
					>
						<span className={candidateHeader}>
							<span className={candidateId}>
								{pendingReturn.referenceNumber}
							</span>
							<span className={candidateBits}>
								{formatWarsawDateTime(new Date(pendingReturn.addedAt))}
							</span>
						</span>
						<span className={candidateMeta}>
							{[pendingReturn.customerName, pendingReturn.postcode]
								.filter(Boolean)
								.join(', ')}
						</span>
						{pendingReturn.packageNumber && (
							<span className={candidateNumberRow}>
								{carrier && (
									<span className={carrierBadgeVariants({ carrier })}>
										{carrierLabelByCarrier[carrier]}
									</span>
								)}
								<span>{shortenNumber(pendingReturn.packageNumber)}</span>
							</span>
						)}
						<span className={candidateProducts}>
							{pendingReturn.products.map((product) => (
								<span key={product.name}>
									{product.name} × {product.quantity}
								</span>
							))}
						</span>
					</button>
				);
			})}
		</div>
	);
}
