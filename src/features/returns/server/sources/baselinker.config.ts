import 'server-only';
import { z } from 'zod';

const BASELINKER_ENDPOINT = 'https://api.baselinker.com/connector.php';
const BASELINKER_TIMEOUT_MILLISECONDS = 20_000;
/** Identyfikator pola dodatkowego „WMS” (kod kreskowy zamówienia w WAPRO) w `custom_extra_fields`. */
const WMS_EXTRA_FIELD_ID = '77709';
const MIN_PAUSE_MILLISECONDS = 650;
const DEFAULT_PAUSE_MILLISECONDS = 1500;

type BaseLinkerConfig = {
	/** `null`, gdy token nie jest ustawiony: integracja wyłączona. */
	token: string | null;
	pauseMilliseconds: number;
};

const baseLinkerEnvSchema = z.object({
	BASELINKER_TOKEN: z
		.string()
		.trim()
		.optional()
		.transform((token) => token || null),
	BASELINKER_PAUSE_MS: z.coerce
		.number()
		.int()
		.min(MIN_PAUSE_MILLISECONDS)
		.catch(DEFAULT_PAUSE_MILLISECONDS),
});

/**
 * Czyta konfigurację BaseLinkera ze zmiennych środowiskowych.
 *
 * @remarks
 * Nie rzuca: pusty token oznacza wyłączoną integrację, a brak albo niepoprawna pauza
 * (poniżej 650 ms) daje domyślne 1500 ms.
 */
function getBaseLinkerConfig(): BaseLinkerConfig {
	const env = baseLinkerEnvSchema.parse(process.env);

	return {
		token: env.BASELINKER_TOKEN,
		pauseMilliseconds: env.BASELINKER_PAUSE_MS,
	};
}

function isBaseLinkerEnabled(): boolean {
	return getBaseLinkerConfig().token !== null;
}

export {
	BASELINKER_ENDPOINT,
	BASELINKER_TIMEOUT_MILLISECONDS,
	type BaseLinkerConfig,
	getBaseLinkerConfig,
	isBaseLinkerEnabled,
	WMS_EXTRA_FIELD_ID,
};
