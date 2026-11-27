import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/shared/components/sheet';
import type { SearchCandidate } from '@/features/returns/model/order-search.types';
import { scannerSheetStyles } from './returns-scanner.styles';
import { ScannerExistingReturnNote } from './scanner-existing-return-note';

const MAX_VISIBLE_CANDIDATES = 3;

type ScannerCandidatesSheetProps = {
	isOpen: boolean;
	candidates: SearchCandidate[];
	onOpenChange: (isOpen: boolean) => void;
	onPick: (candidate: SearchCandidate) => void;
};

/**
 * Panel z 2–3 zamówieniami, które pasują do tropów, z powodami dopasowania.
 * Zamówienie z już przyjętym zwrotem ma wyraźny czerwony znacznik z datą i osobą.
 */
export function ScannerCandidatesSheet({
	isOpen,
	candidates,
	onOpenChange,
	onPick,
}: ScannerCandidatesSheetProps) {
	const {
		content,
		list,
		candidate: candidateStyle,
		candidateHeader,
		candidateId,
		candidateBits,
		candidateReasons,
	} = scannerSheetStyles;

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className={content}>
				<SheetHeader>
					<SheetTitle>Wybierz zamówienie</SheetTitle>
					<SheetDescription>
						Aparat dalej szuka. Wybór zapisze zwrot.
					</SheetDescription>
				</SheetHeader>
				<div className={list}>
					{candidates.slice(0, MAX_VISIBLE_CANDIDATES).map((candidate) => (
						<button
							key={candidate.orderId}
							type="button"
							className={candidateStyle}
							onClick={() => onPick(candidate)}
						>
							<span className={candidateHeader}>
								<span className={candidateId}>{candidate.orderId}</span>
								<span className={candidateBits}>
									{candidate.bits.toFixed(1)} bit
								</span>
							</span>
							{candidate.existingReturn && (
								<ScannerExistingReturnNote
									existingReturn={candidate.existingReturn}
								/>
							)}
							<span className={candidateReasons}>
								{candidate.reasons.map((reason) => reason.label).join(' · ')}
							</span>
						</button>
					))}
					{candidates.length === 0 && <p>Brak kandydatów.</p>}
				</div>
			</SheetContent>
		</Sheet>
	);
}
