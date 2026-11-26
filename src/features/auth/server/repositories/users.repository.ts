import 'server-only';
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
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

type LoginAttemptReservation = {
	userId: number;
	maxAttempts: number;
	lockedUntil: Date;
	now: Date;
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
 * Rezerwuje próbę logowania jednym atomowym `UPDATE`, przed sprawdzeniem hasła.
 *
 * @remarks
 * - Zwiększa licznik tylko wtedy, gdy konto nie jest zablokowane, więc równoległe żądania
 *   nie przekroczą `maxAttempts` prób w oknie blokady.
 * - Próba, która osiąga `maxAttempts`, ustawia `lockedUntil`; licznik zostaje na `maxAttempts`.
 * - Po upływie blokady licznik startuje od 1, a stara blokada jest czyszczona.
 *
 * @returns `false`, gdy konto jest zablokowane (albo nie istnieje).
 */
async function reserveLoginAttempt({
	userId,
	maxAttempts,
	lockedUntil,
	now,
}: LoginAttemptReservation): Promise<boolean> {
	const attemptsBefore = sql`(case when ${users.lockedUntil} is not null then 0 else ${users.failedLoginCount} end)`;

	const reservedRows = await db
		.update(users)
		.set({
			failedLoginCount: sql`${attemptsBefore} + 1`,
			lockedUntil: sql`case when ${attemptsBefore} + 1 >= ${maxAttempts} then ${lockedUntil.toISOString()}::timestamptz else null end`,
		})
		.where(
			and(
				eq(users.id, userId),
				or(isNull(users.lockedUntil), lte(users.lockedUntil, now)),
			),
		)
		.returning({ id: users.id });

	return reservedRows.length > 0;
}

async function resetFailedLogins(userId: number) {
	await db
		.update(users)
		.set({ failedLoginCount: 0, lockedUntil: null })
		.where(eq(users.id, userId));
}

export { findUserByEmail, insertUser, reserveLoginAttempt, resetFailedLogins };
