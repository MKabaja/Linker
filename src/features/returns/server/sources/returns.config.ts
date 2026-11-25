import 'server-only';
import { z } from 'zod';

type ReturnsConfig = {
	isSyncEnabled: boolean;
	/** `null`, gdy `SYNC_SECRET` nie jest ustawiony: każde wywołanie synchronizacji jest odrzucane. */
	syncSecret: string | null;
	isDebugLogEnabled: boolean;
};

const flag = z
	.string()
	.optional()
	.transform((value) => value?.trim().toLowerCase() === 'true');

const returnsEnvSchema = z.object({
	RETURNS_SYNC_ENABLED: flag,
	RETURNS_DEBUG_LOG: flag,
	SYNC_SECRET: z
		.string()
		.trim()
		.optional()
		.transform((secret) => secret || null),
});

/**
 * Czyta flagi modułu zwrotów. Flaga jest włączona tylko dla wartości `true`.
 */
export function getReturnsConfig(): ReturnsConfig {
	const env = returnsEnvSchema.parse(process.env);

	return {
		isSyncEnabled: env.RETURNS_SYNC_ENABLED,
		syncSecret: env.SYNC_SECRET,
		isDebugLogEnabled: env.RETURNS_DEBUG_LOG,
	};
}
