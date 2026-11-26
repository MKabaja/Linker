const WARSAW_TIME_ZONE = 'Europe/Warsaw';

const dateKeyFormat = new Intl.DateTimeFormat('en-CA', {
	timeZone: WARSAW_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

const timeFormat = new Intl.DateTimeFormat('pl-PL', {
	timeZone: WARSAW_TIME_ZONE,
	hour: '2-digit',
	minute: '2-digit',
});

const dateTimeFormat = new Intl.DateTimeFormat('pl-PL', {
	timeZone: WARSAW_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
});

/**
 * Zwraca datę kalendarzową w Polsce jako `YYYY-MM-DD` (np. 23:30 UTC 24.11 to już `2026-11-25`).
 */
function toWarsawDateKey(date: Date): string {
	return dateKeyFormat.format(date);
}

/**
 * Zwraca godzinę w Polsce jako `HH:MM`.
 */
function formatWarsawTime(date: Date): string {
	return timeFormat.format(date);
}

/**
 * Zwraca datę i godzinę w Polsce jako `DD.MM.RRRR, GG:MM`.
 */
function formatWarsawDateTime(date: Date): string {
	return dateTimeFormat.format(date);
}

export {
	formatWarsawDateTime,
	formatWarsawTime,
	toWarsawDateKey,
	WARSAW_TIME_ZONE,
};
