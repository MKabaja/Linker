import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { sessions } from '@/database/schema/sessions.schema';
import { users } from '@/database/schema/users.schema';

type SessionRow = {
	id: string;
	userId: number;
	expiresAt: Date;
};

async function insertSession(session: SessionRow) {
	await db.insert(sessions).values(session);
}

async function findSessionWithUser(sessionId: string) {
	const [sessionWithUser] = await db
		.select({
			expiresAt: sessions.expiresAt,
			user: {
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role,
				deactivatedAt: users.deactivatedAt,
			},
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	return sessionWithUser;
}

async function updateSessionExpiry(sessionId: string, expiresAt: Date) {
	await db
		.update(sessions)
		.set({ expiresAt })
		.where(eq(sessions.id, sessionId));
}

async function deleteSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export {
	deleteSession,
	findSessionWithUser,
	insertSession,
	updateSessionExpiry,
};
