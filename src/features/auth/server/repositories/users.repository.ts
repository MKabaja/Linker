import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { users } from '@/database/schema/users.schema';
import type { UserRole } from '@/features/auth/model/auth.schemas';

type NewUserRow = {
	name: string;
	email: string;
	passwordHash: string;
	role: UserRole;
};

type InsertedUser = { id: number };

/**
 * Wstawia użytkownika, jeśli e-mail jest wolny.
 *
 * @returns `undefined`, gdy użytkownik z tym e-mailem już istnieje.
 */
async function insertUser(
	newUser: NewUserRow,
): Promise<InsertedUser | undefined> {
	const [insertedUser] = await db
		.insert(users)
		.values(newUser)
		.onConflictDoNothing({ target: users.email })
		.returning({ id: users.id });

	return insertedUser;
}

async function findUserByEmail(email: string) {
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	return user;
}

export { findUserByEmail, insertUser };
