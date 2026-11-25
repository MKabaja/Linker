import { input, password, select } from '@inquirer/prompts';
import { loadEnvConfig } from '@next/env';
import type { ZodType } from 'zod';
import {
	type NewUser,
	newUserSchema,
	type UserRole,
} from '@/features/auth/model/auth.schemas';

type RoleChoice = { name: string; value: UserRole };

const ROLE_CHOICES: RoleChoice[] = [
	{ name: 'Pracownik', value: 'employee' },
	{ name: 'Administrator', value: 'admin' },
];

main();

async function main() {
	loadEnvConfig(process.cwd());
	const { createUser } = await import(
		'@/features/auth/server/services/users.service'
	);

	const newUser = await askForNewUser();
	const result = await createUser(newUser);

	if (result.status === 'emailTaken') {
		console.error(`Użytkownik ${newUser.email} już istnieje.`);
		process.exit(1);
	}

	console.log(`Utworzono użytkownika ${newUser.email} (id ${result.id}).`);
	process.exit(0);
}

async function askForNewUser(): Promise<NewUser> {
	const name = await input({
		message: 'Imię:',
		validate: validateWith(newUserSchema.shape.name),
	});
	const email = await input({
		message: 'E-mail:',
		validate: validateWith(newUserSchema.shape.email),
	});
	const userPassword = await askForPassword();
	const role = await select({ message: 'Rola:', choices: ROLE_CHOICES });

	return newUserSchema.parse({ name, email, password: userPassword, role });
}

async function askForPassword(): Promise<string> {
	const firstPassword = await password({
		message: 'Hasło:',
		mask: '*',
		validate: validateWith(newUserSchema.shape.password),
	});
	const repeatedPassword = await password({
		message: 'Powtórz hasło:',
		mask: '*',
	});

	if (firstPassword === repeatedPassword) {
		return firstPassword;
	}

	console.error('Hasła różnią się. Spróbuj jeszcze raz.');
	return askForPassword();
}

function validateWith(schema: ZodType) {
	return (value: string) => {
		const parsed = schema.safeParse(value);
		return parsed.success || (parsed.error.issues[0]?.message ?? false);
	};
}
