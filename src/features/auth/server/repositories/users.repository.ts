import 'server-only';
import { eq, sql } from 'drizzle-orm';
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

type FailedLogin = {
	userId: number;
	maxFailedAttempts: number;
	lockedUntil: Date;
};

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

/**
 * Zwiększa licznik nieudanych logowań w jednym zapytaniu (bez wyścigu przy równoległych próbach).
 *
 * @remarks Po osiągnięciu `maxFailedAttempts` ustawia `lockedUntil` i zeruje licznik.
 */
async function recordFailedLogin({
	userId,
	maxFailedAttempts,
	lockedUntil,
}: FailedLogin) {
	const isLimitReached = sql`${users.failedLoginCount} + 1 >= ${maxFailedAttempts}`;

	await db
		.update(users)
		.set({
			failedLoginCount: sql`case when ${isLimitReached} then 0 else ${users.failedLoginCount} + 1 end`,
			lockedUntil: sql`case when ${isLimitReached} then ${lockedUntil.toISOString()}::timestamptz else ${users.lockedUntil} end`,
		})
		.where(eq(users.id, userId));
}

async function resetFailedLogins(userId: number) {
	await db
		.update(users)
		.set({ failedLoginCount: 0, lockedUntil: null })
		.where(eq(users.id, userId));
}

export { findUserByEmail, insertUser, recordFailedLogin, resetFailedLogins };
