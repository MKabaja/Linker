import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/shared/components/sheet';
import type { TypedNumberCandidate } from '@/features/returns/model/typed-number.types';
import {
	carrierLabelByCarrier,
	detectCarrier,
} from '@/features/returns/utils/carrier';
import { splitPackageNumber } from '@/features/returns/utils/package-suffix-highlight';
import { formatWarsawDateTime } from '@/shared/lib/warsaw-time';
import {
	carrierBadgeVariants,
	scannerSheetStyles,
} from './returns-scanner.styles';
import { ScannerExistingReturnNote } from './scanner-existing-return-note';

const VISIBLE_HEAD_LENGTH = 8;

type ScannerTypedCandidatesSheetProps = {
	isOpen: boolean;
	candidates: TypedNumberCandidate[];
	/** Wpisana końcówka numeru (wielkie litery i cyfry), wyróżniana w numerach paczek. */
	suffix: string;
	onOpenChange: (isOpen: boolean) => void;
	onPick: (candidate: TypedNumberCandidate) => void;
};

/**
 * Lista zamówień pasujących do wpisanej końcówki numeru paczki albo kodu zwrotu. Wybór zapisuje zwrot.
 */
export function ScannerTypedCandidatesSheet({
	isOpen,
	candidates,
	suffix,
	onOpenChange,
	onPick,
}: ScannerTypedCandidatesSheetProps) {
	const {
		content,
		list,
		candidate: candidateStyle,
		candidateHeader,
		candidateId,
		candidateBits,
		candidateNumberRow,
		candidateNumberTail,
		candidateMeta,
	} = scannerSheetStyles;

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className={content}>
				<SheetHeader>
					<SheetTitle>Wybierz zamówienie</SheetTitle>
					<SheetDescription>
						Pasują do wpisanego numeru. Wybór zapisze zwrot.
					</SheetDescription>
				</SheetHeader>
				<div className={list}>
					{candidates.map((candidate) => {
						const carrier = candidate.packageNumber
							? detectCarrier(candidate.packageNumber)
							: null;
						const { head, tail } = splitPackageNumber(
							candidate.packageNumber ?? '',
							suffix,
						);

						return (
							<button
								key={candidate.orderId}
								type="button"
								className={candidateStyle}
								onClick={() => onPick(candidate)}
							>
								<span className={candidateHeader}>
									<span className={candidateId}>{candidate.orderId}</span>
									<span className={candidateBits}>
										{formatWarsawDateTime(new Date(candidate.orderedAt))}
									</span>
								</span>
								{candidate.existingReturn && (
									<ScannerExistingReturnNote
										existingReturn={candidate.existingReturn}
									/>
								)}
								<span className={candidateNumberRow}>
									{carrier && (
										<span className={carrierBadgeVariants({ carrier })}>
											{carrierLabelByCarrier[carrier]}
										</span>
									)}
									{candidate.returnReference ? (
										<span className={candidateNumberTail}>
											Zwrot {candidate.returnReference}
										</span>
									) : (
										<span>
											…{head.slice(-VISIBLE_HEAD_LENGTH)}
											<span className={candidateNumberTail}>{tail}</span>
										</span>
									)}
								</span>
								{candidate.customerName && (
									<span className={candidateMeta}>
										{candidate.customerName}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</SheetContent>
		</Sheet>
	);
}
