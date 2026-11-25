import 'server-only';
import { db } from '@/database/client';
import { sessions } from '@/database/schema/sessions.schema';

type SessionRow = {
	id: string;
	userId: number;
	expiresAt: Date;
};

async function insertSession(session: SessionRow) {
	await db.insert(sessions).values(session);
}

export { insertSession };
