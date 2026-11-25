import type { LogInFailureReason } from './auth.types';

type LogInErrorMessageByReason = Record<LogInFailureReason, string>;

const SESSION_COOKIE_NAME = 'session';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const SESSION_DURATION_MILLISECONDS = 30 * DAY_IN_MILLISECONDS;
const SESSION_RENEWAL_THRESHOLD_MILLISECONDS = 15 * DAY_IN_MILLISECONDS;

const SESSION_COOKIE_OPTIONS = {
	httpOnly: true,
	secure: true,
	sameSite: 'lax',
	path: '/',
} as const;

const logInErrorMessageByReason: LogInErrorMessageByReason = {
	invalidCredentials: 'Nieprawidłowy e-mail lub hasło.',
};

export {
	logInErrorMessageByReason,
	SESSION_COOKIE_NAME,
	SESSION_COOKIE_OPTIONS,
	SESSION_DURATION_MILLISECONDS,
	SESSION_RENEWAL_THRESHOLD_MILLISECONDS,
};
