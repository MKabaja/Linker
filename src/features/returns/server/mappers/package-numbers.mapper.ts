import 'server-only';

type PackageNumberRow = {
	orderId: number;
	packageNumber: string;
	innerNumber: string;
};

type ReturnPackageNumberRow = { orderId: number; packageNumber: string };

type CollectPackageNumbers = {
	packages: PackageNumberRow[];
	returns: ReturnPackageNumberRow[];
};

/**
 * Scala numery paczek zamówień (numer przewoźnika i wewnętrzny) z numerami paczek zwrotów z modułu zwrotów.
 * Puste numery są pomijane, a powtórzenia usuwane.
 */
function collectPackageNumbersByOrderId({
	packages,
	returns,
}: CollectPackageNumbers): Map<number, string[]> {
	const numbersByOrderId = new Map<number, Set<string>>();
	const rows = [
		...packages.map(({ orderId, packageNumber, innerNumber }) => ({
			orderId,
			numbers: [packageNumber, innerNumber],
		})),
		...returns.map(({ orderId, packageNumber }) => ({
			orderId,
			numbers: [packageNumber],
		})),
	];

	for (const { orderId, numbers } of rows) {
		const knownNumbers = numbersByOrderId.get(orderId) ?? new Set<string>();

		for (const number of numbers) {
			if (number) {
				knownNumbers.add(number);
			}
		}

		numbersByOrderId.set(orderId, knownNumbers);
	}

	return new Map(
		[...numbersByOrderId].map(([orderId, numbers]) => [orderId, [...numbers]]),
	);
}

export { collectPackageNumbersByOrderId };
