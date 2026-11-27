import type { ExistingReturn } from '@/features/returns/model/order-search.types';
import { formatWarsawDateTime } from '@/shared/lib/warsaw-time';
import { scannerSheetStyles } from './returns-scanner.styles';

type ScannerExistingReturnNoteProps = { existingReturn: ExistingReturn };

/**
 * Czerwony znacznik zamówienia, dla którego zwrot już przyjęto: data i osoba, a po usunięciu także kto i kiedy.
 */
export function ScannerExistingReturnNote({
	existingReturn,
}: ScannerExistingReturnNoteProps) {
	const { deletedAt, deletedByName, receivedAt, receivedByName } =
		existingReturn;

	return (
		<span className={scannerSheetStyles.existingReturn}>
			Zwrot przyjęty {formatWarsawDateTime(new Date(receivedAt))} przez{' '}
			{receivedByName}
			{deletedAt &&
				`, usunięty ${formatWarsawDateTime(new Date(deletedAt))} przez ${deletedByName ?? '—'}`}
		</span>
	);
}
