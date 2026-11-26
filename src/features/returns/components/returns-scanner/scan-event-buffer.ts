import type { ClientEvent } from '@/features/returns/model/event-log.schemas';

const MAX_BUFFERED_EVENTS = 500;
const MAX_BATCH_SIZE = 100;
const MAX_SEEN_READS = 2_000;

type ReadIdentity = { kind: string; source: string; text: string };

type BatchSplit = { batch: ClientEvent[]; rest: ClientEvent[] };

/**
 * Dopisuje zdarzenie na koniec bufora; przy przepełnieniu odpadają najstarsze.
 */
function appendEvent(
	buffer: ClientEvent[],
	event: ClientEvent,
	maxSize = MAX_BUFFERED_EVENTS,
): ClientEvent[] {
	return [...buffer, event].slice(-maxSize);
}

/**
 * Wydziela najstarsze zdarzenia do jednej wysyłki; reszta zostaje w buforze.
 */
function takeBatch(buffer: ClientEvent[], size = MAX_BATCH_SIZE): BatchSplit {
	return { batch: buffer.slice(0, size), rest: buffer.slice(size) };
}

/**
 * Zapamiętuje odczyt w `seen` i zwraca `true`, gdy ten rodzaj, źródło i tekst nie wystąpiły wcześniej w skanie.
 *
 * @remarks Mutuje `seen`; po przekroczeniu limitu zapamiętanych odczytów zaczyna od zera.
 */
function markReadAsNew(seen: Set<string>, read: ReadIdentity): boolean {
	const key = `${read.kind}|${read.source}|${normalizeText(read.text)}`;

	if (seen.has(key)) {
		return false;
	}
	if (seen.size >= MAX_SEEN_READS) {
		seen.clear();
	}
	seen.add(key);
	return true;
}

function normalizeText(text: string): string {
	return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

export { appendEvent, markReadAsNew, takeBatch };
