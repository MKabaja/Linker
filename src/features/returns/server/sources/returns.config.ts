import 'server-only';
import { z } from 'zod';

type ReturnsConfig = {
	isSyncEnabled: boolean;
	/** `null`, gdy `SYNC_SECRET` nie jest ustawiony: każde wywołanie synchronizacji jest odrzucane. */
	syncSecret: string | null;
};

const MIN_SYNC_SECRET_LENGTH = 32;

const flag = z
	.string()
	.optional()
	.transform((value) => value?.trim().toLowerCase() === 'true');

const returnsEnvSchema = z.object({
	RETURNS_SYNC_ENABLED: flag,
	SYNC_SECRET: z
		.string()
		.trim()
		.optional()
		.transform((secret) => secret || null)
		.pipe(z.string().min(MIN_SYNC_SECRET_LENGTH).nullable()),
});

/**
 * Czyta flagi modułu zwrotów. Flaga jest włączona tylko dla wartości `true`.
 *
 * @remarks Rzuca wyjątek, gdy `SYNC_SECRET` jest ustawiony, ale ma mniej niż 32 znaki; pusty oznacza brak sekretu.
 */
export function getReturnsConfig(): ReturnsConfig {
	const env = returnsEnvSchema.parse(process.env);

	return {
		isSyncEnabled: env.RETURNS_SYNC_ENABLED,
		syncSecret: env.SYNC_SECRET,
	};
}
