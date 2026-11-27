import type {
	OrderDetailsPackage,
	ReturnMatchedBy,
} from '@/features/returns/model/returns.types';
import {
	type Carrier,
	detectCarrier,
	extractDpdParcelNumber,
} from '@/features/returns/utils/carrier';
import { normalizeCode } from '@/features/returns/utils/normalize-text';

type ReturnMatchInput = {
	matchedBy: ReturnMatchedBy;
	scannedLabel: string | null;
	packages: OrderDetailsPackage[];
};

type PackageMatch =
	| { kind: 'none' }
	| { kind: 'shipping' }
	| { kind: 'return' };

type ReturnMatch = {
	matchedBy: ReturnMatchedBy;
	scannedLabel: string | null;
	carrier: Carrier | null;
	packageMatch: PackageMatch;
};

/**
 * Opisuje, po czym znaleziono zwrot: sposób dopasowania, zapisany numer, przewoźnik z jego formatu
 * i to, czy numer jest jedną z paczek zamówienia (wysyłkową albo zwrotną).
 *
 * @remarks Numer porównuje się po normalizacji z numerem paczki i numerem wewnętrznym; pełny kod kreskowy DPD także po numerze paczki z jego wnętrza.
 */
function describeReturnMatch({
	matchedBy,
	scannedLabel,
	packages,
}: ReturnMatchInput): ReturnMatch {
	if (!scannedLabel) {
		return {
			matchedBy,
			scannedLabel,
			carrier: null,
			packageMatch: { kind: 'none' },
		};
	}

	return {
		matchedBy,
		scannedLabel,
		carrier: detectCarrier(scannedLabel),
		packageMatch: findPackageMatch(scannedLabel, packages),
	};
}

function findPackageMatch(
	scannedLabel: string,
	packages: OrderDetailsPackage[],
): PackageMatch {
	const normalized = normalizeCode(scannedLabel);
	const scannedNumbers = [normalized, extractDpdParcelNumber(normalized)];
	const matchedPackage = packages.find(({ packageNumber, innerNumber }) =>
		scannedNumbers.some(
			(scannedNumber) =>
				scannedNumber !== null &&
				(scannedNumber === normalizeCode(packageNumber) ||
					scannedNumber === normalizeCode(innerNumber)),
		),
	);

	if (!matchedPackage) {
		return { kind: 'none' };
	}

	return { kind: matchedPackage.isReturn ? 'return' : 'shipping' };
}

export { describeReturnMatch, type PackageMatch, type ReturnMatch };
