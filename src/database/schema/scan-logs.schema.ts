import {
	bigint,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

const scanOutcomeEnum = pgEnum('scan_outcome', [
	'auto',
	'manual-pick',
	'manual-entry',
	'not-found',
	'aborted',
]);

const scanLogs = pgTable(
	'scan_logs',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		scanId: uuid().defaultRandom().unique().notNull(),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		startedAt: timestamp({ withTimezone: true }).notNull(),
		durationMs: integer().notNull(),
		outcome: scanOutcomeEnum().notNull(),
		chosenOrderId: bigint({ mode: 'number' }),
		traces: jsonb().notNull(),
		topCandidates: jsonb().notNull(),
		ocr: jsonb().notNull(),
		carriers: jsonb().notNull(),
		cameraLabel: varchar({ length: 200 }),
		diagnostics: jsonb(),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index('scan_logs_created_at_idx').on(table.createdAt)],
);

export { scanLogs, scanOutcomeEnum };
