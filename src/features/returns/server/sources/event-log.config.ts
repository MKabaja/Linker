import 'server-only';
import path from 'node:path';
import { z } from 'zod';

const DEFAULT_EVENT_LOG_DIRECTORY = 'logs/returns';
const EVENT_LOG_RETENTION_DAYS = 30;

const enabledByDefaultFlag = z
	.string()
	.optional()
	.transform((value) => value?.trim().toLowerCase() !== 'false');

const eventLogEnvSchema = z.object({
	RETURNS_EVENT_LOG: enabledByDefaultFlag,
	RETURNS_LOG_OCR_TEXT: enabledByDefaultFlag,
	RETURNS_EVENT_LOG_DIR: z
		.string()
		.trim()
		.optional()
		.transform((directory) =>
			path.resolve(
				/* turbopackIgnore: true */ process.cwd(),
				directory || DEFAULT_EVENT_LOG_DIRECTORY,
			),
		),
});

const env = eventLogEnvSchema.parse(process.env);

const IS_EVENT_LOG_ENABLED = env.RETURNS_EVENT_LOG;
const IS_OCR_TEXT_LOGGED = env.RETURNS_LOG_OCR_TEXT;
const EVENT_LOG_DIRECTORY = env.RETURNS_EVENT_LOG_DIR;

export {
	EVENT_LOG_DIRECTORY,
	EVENT_LOG_RETENTION_DAYS,
	IS_EVENT_LOG_ENABLED,
	IS_OCR_TEXT_LOGGED,
};
