import type { TraceQuery } from '@/features/returns/model/traces.types';

const RETURN_REFERENCE = /^([A-Z0-9]{4})\s?\/\s?(\d{4})$/;
const RETURN_REFERENCE_IN_TEXT = /(?<![A-Z0-9])[A-Z0-9]{4}\s?\/\s?\d{4}(?!\d)/g;
const LETTER = /[A-Z]/;

/**
 * Zamienia kod zwrotu Allegro (`NZ5J/2026`, `NZ5J / 2026`) na postać kanoniczną `NZ5J/2026`.
 * Wielkość liter ma znaczenie: kod jest drukowany wielkimi literami.
 *
 * @returns Kod albo `null`, gdy tekst nie ma kształtu 4 znaków, `/` i roku.
 */
function parseReturnReference(text: string): string | null {
	const match = RETURN_REFERENCE.exec(text.trim());
	return match ? `${match[1]}/${match[2]}` : null;
}

/**
 * Sprawdza, czy fragment tekstu OCR to kod zwrotu. Wymaga co najmniej jednej litery w części przed `/`,
 * żeby numery dokumentów w rodzaju `1234/2026` nie stawały się tropem.
 */
function isReturnReferenceRead(text: string): boolean {
	const reference = parseReturnReference(text);
	return reference !== null && LETTER.test(reference.slice(0, 4));
}

/**
 * Zwraca kody zwrotu z tropów `returnReference` bez powtórzeń, w postaci kanonicznej.
 */
function collectReturnReferences(traces: TraceQuery[]): string[] {
	const references = new Set<string>();
	for (const trace of traces) {
		if (trace.kind !== 'returnReference') {
			continue;
		}
		const reference = parseReturnReference(trace.pattern.join(''));
		if (reference) {
			references.add(reference);
		}
	}
	return [...references];
}

type ReturnReferenceRow = { referenceNumber: string; orderId: number };

/**
 * Buduje mapę kod zwrotu (`NZ5J/2026`, wielkimi literami) na zamówienie.
 * Dla powtórzonego kodu wygrywa pierwszy wiersz, więc wiersze powinny iść od najnowszego.
 */
function indexOrderIdsByReturnReference(
	rows: ReturnReferenceRow[],
): Map<string, number> {
	const orderIdByReference = new Map<string, number>();
	for (const { referenceNumber, orderId } of rows) {
		const upperCased = referenceNumber.trim().toUpperCase();
		const reference = parseReturnReference(upperCased) ?? upperCased;
		if (reference && !orderIdByReference.has(reference)) {
			orderIdByReference.set(reference, orderId);
		}
	}
	return orderIdByReference;
}

export {
	collectReturnReferences,
	indexOrderIdsByReturnReference,
	isReturnReferenceRead,
	parseReturnReference,
	RETURN_REFERENCE_IN_TEXT,
};
