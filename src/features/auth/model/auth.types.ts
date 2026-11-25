type LogInFailureReason = 'invalidCredentials';

type LogInFormState =
	| { status: 'idle'; email: string }
	| { status: 'error'; email: string; message: string };

type NewSession = {
	token: string;
	expiresAt: Date;
};

export type { LogInFailureReason, LogInFormState, NewSession };
