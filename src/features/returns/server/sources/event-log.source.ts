import 'server-only';
import { execFile } from 'node:child_process';
import { appendFile, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { ReturnsEventInput } from '@/features/returns/model/event-log.types';
import {
	groupLinesByDay,
	type QueuedEvent,
	selectExpiredLogFiles,
	toLogFileName,
} from '@/features/returns/utils/event-log-files';
import { getProcessSingleton } from '@/shared/lib/process-singleton';
import {
	EVENT_LOG_DIRECTORY,
	EVENT_LOG_RETENTION_DAYS,
	IS_EVENT_LOG_ENABLED,
	IS_OCR_TEXT_LOGGED,
} from './event-log.config';

const FLUSH_DELAY_MS = 500;
const MAX_QUEUED_EVENTS = 5_000;
const MAX_EVENTS_PER_WRITE = 1_000;
const GIT_TIMEOUT_MS = 2_000;

type EventLogState = {
	queue: QueuedEvent[];
	isFlushScheduled: boolean;
	isFlushing: boolean;
	preparedDays: Set<string>;
	appVersion: Promise<string | null> | null;
	failedEventCount: number;
	droppedEventCount: number;
	hasWarned: boolean;
};

type EventLogHealth = { failedEventCount: number; droppedEventCount: number };

const state = getProcessSingleton<EventLogState>('returns.event-log', () => ({
	queue: [],
	isFlushScheduled: false,
	isFlushing: false,
	preparedDays: new Set(),
	appVersion: null,
	failedEventCount: 0,
	droppedEventCount: 0,
	hasWarned: false,
}));

/**
 * Dopisuje zdarzenie do kolejki w pamięci i wraca od razu; zapis do pliku dnia dzieje się w tle.
 *
 * @remarks
 * Nigdy nie rzuca i nie czeka na dysk. Przy wyłączonym `RETURNS_EVENT_LOG` nic nie robi.
 * Błędy zapisu są tylko liczone (`getEventLogHealth`), a pierwszy trafia do `console.warn`.
 * Przy pełnej kolejce (5000) nowe zdarzenia są odrzucane. Surowy tekst odczytów trafia na dysk tylko przy `RETURNS_LOG_OCR_TEXT`.
 */
function logReturnsEvent(event: ReturnsEventInput): void {
	if (!IS_EVENT_LOG_ENABLED) {
		return;
	}
	if (state.queue.length >= MAX_QUEUED_EVENTS) {
		state.droppedEventCount++;
		return;
	}
	state.queue.push({ at: new Date(), event });
	scheduleFlush();
}

/**
 * Czy dziennik jest włączony; pozwala pominąć kosztowne przygotowanie danych tylko do logu.
 */
function isEventLogEnabled(): boolean {
	return IS_EVENT_LOG_ENABLED;
}

function getEventLogHealth(): EventLogHealth {
	return {
		failedEventCount: state.failedEventCount,
		droppedEventCount: state.droppedEventCount,
	};
}

function scheduleFlush(): void {
	if (state.isFlushScheduled || state.isFlushing) {
		return;
	}
	state.isFlushScheduled = true;
	setTimeout(() => void flushQueue(), FLUSH_DELAY_MS).unref();
}

async function flushQueue(): Promise<void> {
	state.isFlushScheduled = false;
	state.isFlushing = true;

	while (state.queue.length > 0) {
		const batch = state.queue.splice(0, MAX_EVENTS_PER_WRITE);
		await writeBatch(batch);
	}

	state.isFlushing = false;
}

async function writeBatch(batch: QueuedEvent[]): Promise<void> {
	try {
		state.appVersion ??= readAppVersion();
		const textByDay = groupLinesByDay(batch, {
			appVersion: await state.appVersion,
			isOcrTextLogged: IS_OCR_TEXT_LOGGED,
		});

		for (const [dayKey, text] of textByDay) {
			await prepareDay(dayKey);
			await appendFile(
				path.join(EVENT_LOG_DIRECTORY, toLogFileName(dayKey)),
				text,
			);
		}
	} catch (error) {
		state.failedEventCount += batch.length;
		warnOnce(error);
	}
}

async function prepareDay(dayKey: string): Promise<void> {
	if (state.preparedDays.has(dayKey)) {
		return;
	}
	await mkdir(EVENT_LOG_DIRECTORY, { recursive: true });
	state.preparedDays.add(dayKey);
	await removeExpiredFiles(dayKey);
}

async function removeExpiredFiles(todayKey: string): Promise<void> {
	try {
		const expiredFileNames = selectExpiredLogFiles({
			fileNames: await readdir(EVENT_LOG_DIRECTORY),
			todayKey,
			retentionDays: EVENT_LOG_RETENTION_DAYS,
		});
		await Promise.all(
			expiredFileNames.map((fileName) =>
				unlink(path.join(EVENT_LOG_DIRECTORY, fileName)),
			),
		);
	} catch (error) {
		warnOnce(error);
	}
}

function readAppVersion(): Promise<string | null> {
	return new Promise((resolve) => {
		execFile(
			'git',
			['rev-parse', '--short', 'HEAD'],
			{ timeout: GIT_TIMEOUT_MS, windowsHide: true },
			(error, stdout) => resolve(error ? null : stdout.trim() || null),
		);
	});
}

function warnOnce(error: unknown): void {
	if (state.hasWarned) {
		return;
	}
	state.hasWarned = true;
	console.warn(
		'[returns-event-log] Zapis dziennika nie powiódł się; kolejne błędy są tylko liczone.',
		error instanceof Error ? error.message : error,
	);
}

export { getEventLogHealth, isEventLogEnabled, logReturnsEvent };
