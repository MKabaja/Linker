import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { syncState } from '@/database/schema/sync-state.schema';

async function findSyncValue(key: string): Promise<string | null> {
	const [row] = await db
		.select({ value: syncState.value })
		.from(syncState)
		.where(eq(syncState.key, key))
		.limit(1);

	return row?.value ?? null;
}

async function saveSyncValue(key: string, value: string): Promise<void> {
	await db
		.insert(syncState)
		.values({ key, value })
		.onConflictDoUpdate({
			target: syncState.key,
			set: { value, updatedAt: new Date() },
		});
}

export { findSyncValue, saveSyncValue };
