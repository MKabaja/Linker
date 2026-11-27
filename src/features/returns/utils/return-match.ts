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

type PackageLookup = {
	orderPackage: OrderDetailsPackage | null;
	isExact: boolean;
};

const MAX_EDGE_NOISE_LENGTH = 2;
const MIN_TOLERANT_NUMBER_LENGTH = 10;

/**
 * Opisuje, po czym znaleziono zwrot: sposób dopasowania, zapisany numer, przewoźnik z jego formatu
 * i to, czy numer jest jedną z paczek zamówienia (wysyłkową albo zwrotną).
 *
 * @remarks Numer porównuje się po normalizacji z numerem paczki i numerem wewnętrznym; pełny kod kreskowy DPD także po numerze paczki z jego wnętrza.
 * Gdy dokładnego trafienia nie ma, numer pasuje też, jeśli zawiera numer paczki (albo odwrotnie) z nadmiarem do 2 znaków na brzegach
 * (np. cyfra dokleiona przez OCR); wtedy przewoźnik pochodzi z numeru paczki zamówienia. Numery krótsze niż 10 znaków nie są tak porównywane.
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

	const { orderPackage, isExact } = findPackage(scannedLabel, packages);

	return {
		matchedBy,
		scannedLabel,
		carrier:
			orderPackage && !isExact
				? detectCarrier(orderPackage.packageNumber)
				: detectCarrier(scannedLabel),
		packageMatch: toPackageMatch(orderPackage),
	};
}

function toPackageMatch(
	orderPackage: OrderDetailsPackage | null,
): PackageMatch {
	if (!orderPackage) {
		return { kind: 'none' };
	}

	return { kind: orderPackage.isReturn ? 'return' : 'shipping' };
}

function findPackage(
	scannedLabel: string,
	packages: OrderDetailsPackage[],
): PackageLookup {
	const normalized = normalizeCode(scannedLabel);
	const dpdParcelNumber = extractDpdParcelNumber(normalized);
	const scannedNumbers = dpdParcelNumber
		? [normalized, dpdParcelNumber]
		: [normalized];
	const exactPackage = packages.find((orderPackage) =>
		scannedNumbers.some((scannedNumber) =>
			getPackageNumbers(orderPackage).includes(scannedNumber),
		),
	);

	if (exactPackage) {
		return { orderPackage: exactPackage, isExact: true };
	}

	const tolerantPackage = packages.find((orderPackage) =>
		getPackageNumbers(orderPackage).some((packageNumber) =>
			isEdgeNoiseMatch(normalized, packageNumber),
		),
	);

	return { orderPackage: tolerantPackage ?? null, isExact: false };
}

function getPackageNumbers({
	packageNumber,
	innerNumber,
}: OrderDetailsPackage): string[] {
	return [normalizeCode(packageNumber), normalizeCode(innerNumber)];
}

function isEdgeNoiseMatch(
	scannedNumber: string,
	packageNumber: string,
): boolean {
	const [shorter, longer] =
		scannedNumber.length <= packageNumber.length
			? [scannedNumber, packageNumber]
			: [packageNumber, scannedNumber];

	return (
		shorter.length >= MIN_TOLERANT_NUMBER_LENGTH &&
		longer.length - shorter.length <= MAX_EDGE_NOISE_LENGTH &&
		longer.includes(shorter)
	);
}

export { describeReturnMatch, type PackageMatch, type ReturnMatch };
