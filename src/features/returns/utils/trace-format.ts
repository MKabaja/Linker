import type {
	NumberTraceKind,
	TraceQuery,
	TraceSource,
} from '@/features/returns/model/traces.types';
import {
	type PhoneMask,
	patternToString,
} from '@/features/returns/utils/pattern-parser';

const MAX_UNSHORTENED_LENGTH = 12;
const SHORTENED_EDGE_LENGTH = 4;
const POSTCODE_HEAD_LENGTH = 2;

type NumberDescriber = (text: string, sources: TraceSource[]) => string;
type NumberDescriberByKind = Record<NumberTraceKind, NumberDescriber>;

const numberDescriberByKind: NumberDescriberByKind = {
	package: (text, sources) =>
		`${sources.includes('code') ? 'Kod' : 'Numer'} ${shortenNumber(text)}`,
	orderId: (text) => `Zamówienie ${text}`,
	externalId: (text) => `ID zewn. ${shortenNumber(text)}`,
	postcode: (text) =>
		`Kod poczt. ${text.slice(0, POSTCODE_HEAD_LENGTH)}-${text.slice(POSTCODE_HEAD_LENGTH)}`,
};

/**
 * Zwraca krótki opis tropu po polsku do pokazania na skanerze, np. `Telefon 7320___83`, `Kod 6209…0166`.
 */
function describeTrace(query: TraceQuery, sources: TraceSource[]): string {
	if (query.kind === 'name') {
		return `Imię ${query.prefixes.map((prefix) => `${prefix}***`).join(' ')}`;
	}
	if (query.kind === 'phone') {
		return `Telefon ${formatPhoneMask(query)}`;
	}
	return numberDescriberByKind[query.kind](
		patternToString(query.pattern),
		sources,
	);
}

function formatPhoneMask({ pattern, anchored }: PhoneMask): string {
	if (pattern) {
		return patternToString(pattern);
	}
	return `${anchored?.prefix ?? ''}…${anchored?.suffix ?? ''}`;
}

function shortenNumber(text: string): string {
	if (text.length <= MAX_UNSHORTENED_LENGTH) {
		return text;
	}
	return `${text.slice(0, SHORTENED_EDGE_LENGTH)}…${text.slice(-SHORTENED_EDGE_LENGTH)}`;
}

export { describeTrace, formatPhoneMask, shortenNumber };
