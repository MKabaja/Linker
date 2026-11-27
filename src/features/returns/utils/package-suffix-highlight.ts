type SplitPackageNumber = { head: string; tail: string };

/**
 * Dzieli numer paczki na początek i wpisaną końcówkę (do wyróżnienia w liście).
 * Gdy numer nie kończy się końcówką, cały numer trafia do `head`.
 */
function splitPackageNumber(
	packageNumber: string,
	suffix: string,
): SplitPackageNumber {
	if (!suffix || !packageNumber.endsWith(suffix)) {
		return { head: packageNumber, tail: '' };
	}
	return {
		head: packageNumber.slice(0, packageNumber.length - suffix.length),
		tail: suffix,
	};
}

export { type SplitPackageNumber, splitPackageNumber };
