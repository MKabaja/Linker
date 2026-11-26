import type { ReturnMatchedBy } from '@/features/returns/model/returns.types';

type ScannerMatchedBy = Exclude<ReturnMatchedBy, 'imported'>;

/** Sposoby dopasowania, które może zgłosić ekran przyjęcia; `imported` nadaje tylko import. */
const SCANNER_MATCHED_BY = [
	'auto',
	'manual-pick',
	'manual-entry',
] as const satisfies readonly ScannerMatchedBy[];

/** Kto przyjął zwrot przeniesiony z demo, w miejsce imienia pracownika. */
const IMPORTED_RECEIVER_NAME = 'import z demo';

/** Najdłuższy zapamiętywany numer etykiety lub paczki. */
const SCANNED_LABEL_MAX_LENGTH = 64;

export {
	IMPORTED_RECEIVER_NAME,
	SCANNED_LABEL_MAX_LENGTH,
	SCANNER_MATCHED_BY,
	type ScannerMatchedBy,
};
