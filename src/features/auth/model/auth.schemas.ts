import { z } from 'zod';

type NewUser = z.output<typeof newUserSchema>;
type UserRole = NewUser['role'];
type LogInCredentials = z.output<typeof logInSchema>;

const emailSchema = z
	.string()
	.trim()
	.toLowerCase()
	.max(255, { error: 'E-mail może mieć najwyżej 255 znaków.' })
	.pipe(z.email({ error: 'Podaj poprawny adres e-mail.' }));

const newUserSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, { error: 'Podaj imię.' })
		.max(50, { error: 'Imię może mieć najwyżej 50 znaków.' }),
	email: emailSchema,
	password: z
		.string()
		.min(8, { error: 'Hasło musi mieć co najmniej 8 znaków.' })
		.max(64, { error: 'Hasło może mieć najwyżej 64 znaki.' }),
	role: z.enum(['employee', 'admin']).default('employee'),
});

const logInSchema = z.object({
	email: emailSchema,
	password: z.string().min(1).max(64),
});

export {
	type LogInCredentials,
	logInSchema,
	type NewUser,
	newUserSchema,
	type UserRole,
};
