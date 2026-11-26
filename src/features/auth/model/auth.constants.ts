import type { LogInFailureReason } from './auth.types';

type LogInErrorMessageByReason = Record<LogInFailureReason, string>;

const SESSION_COOKIE_NAME = 'session';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const SESSION_DURATION_MILLISECONDS = 30 * DAY_IN_MILLISECONDS;
const SESSION_RENEWAL_THRESHOLD_MILLISECONDS = 15 * DAY_IN_MILLISECONDS;
const MAX_FAILED_LOGIN_ATTEMPTS = 10;
const LOGIN_LOCKOUT_MILLISECONDS = 15 * 60 * 1000;

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
	LOGIN_LOCKOUT_MILLISECONDS,
	logInErrorMessageByReason,
	MAX_FAILED_LOGIN_ATTEMPTS,
	SESSION_COOKIE_NAME,
	SESSION_COOKIE_OPTIONS,
	SESSION_DURATION_MILLISECONDS,
	SESSION_RENEWAL_THRESHOLD_MILLISECONDS,
};
