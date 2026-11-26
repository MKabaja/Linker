import {
	EVENT_LOG_VERSION,
	type ReturnsEvent,
	type ReturnsEventInput,
} from '@/features/returns/model/event-log.types';
import { toWarsawDateKey } from '@/shared/lib/warsaw-time';

const LOG_FILE_NAME_PATTERN = /^(\d{4}-\d{2}-\d{2})\.jsonl$/;
const MILLISECONDS_PER_DAY = 86_400_000;

type QueuedEvent = { at: Date; event: ReturnsEventInput };

type SerializeOptions = { appVersion: string | null; isOcrTextLogged: boolean };

type ExpiredFilesQuery = {
	fileNames: string[];
	todayKey: string;
	retentionDays: number;
};

/**
 * Zamienia zdarzenia na linie JSONL zgrupowane po dniu w strefie Europe/Warsaw (`YYYY-MM-DD`).
 *
 * @remarks Bez `isOcrTextLogged` usuwa surowy tekst odczytów (`text`), zanim linia powstanie.
 */
function groupLinesByDay(
	queue: QueuedEvent[],
	options: SerializeOptions,
): Map<string, string> {
	const textByDay = new Map<string, string>();

	for (const { at, event } of queue) {
		const dayKey = toWarsawDateKey(at);
		const line = serializeEvent({ at, event }, options);
		textByDay.set(dayKey, `${textByDay.get(dayKey) ?? ''}${line}\n`);
	}

	return textByDay;
}

/**
 * Zwraca pliki dziennika starsze niż `retentionDays` dni względem `todayKey`; obce nazwy zostawia.
 */
function selectExpiredLogFiles({
	fileNames,
	todayKey,
	retentionDays,
}: ExpiredFilesQuery): string[] {
	const cutoffMs = Date.parse(todayKey) - retentionDays * MILLISECONDS_PER_DAY;
	const cutoffKey = new Date(cutoffMs).toISOString().slice(0, 10);

	return fileNames.filter((fileName) => {
		const dayKey = LOG_FILE_NAME_PATTERN.exec(fileName)?.[1];
		return dayKey !== undefined && dayKey < cutoffKey;
	});
}

function toLogFileName(dayKey: string): string {
	return `${dayKey}.jsonl`;
}

function serializeEvent(
	{ at, event }: QueuedEvent,
	{ appVersion, isOcrTextLogged }: SerializeOptions,
): string {
	const line: ReturnsEvent = {
		v: EVENT_LOG_VERSION,
		at: at.toISOString(),
		...(isOcrTextLogged ? event : withoutOcrText(event)),
		appVersion,
	};

	return JSON.stringify(line);
}

function withoutOcrText(event: ReturnsEventInput): ReturnsEventInput {
	if (event.type !== 'scan.read' && event.type !== 'scan.trace-rejected') {
		return event;
	}

	const { text: _text, ...rest } = event;
	return rest;
}

export {
	groupLinesByDay,
	type QueuedEvent,
	selectExpiredLogFiles,
	toLogFileName,
};
