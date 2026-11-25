import type { UserRole } from './auth.schemas';

type CurrentUser = {
	id: number;
	name: string;
	email: string;
	role: UserRole;
};

type LogInFailureReason = 'invalidCredentials';

type LogInFormState =
	| { status: 'idle'; email: string }
	| { status: 'error'; email: string; message: string };

type NewSession = {
	token: string;
	expiresAt: Date;
};

export type { CurrentUser, LogInFailureReason, LogInFormState, NewSession };
