import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	timestamp,
} from 'drizzle-orm/pg-core';
import { returns } from './returns.schema';
import { users } from './users.schema';

const returnEventKindEnum = pgEnum('return_event_kind', ['created', 'updated']);

const returnEvents = pgTable(
	'return_events',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		returnId: integer()
			.notNull()
			.references(() => returns.id, { onDelete: 'cascade' }),
		kind: returnEventKindEnum().notNull(),
		snapshot: jsonb().notNull(),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index('return_events_return_id_idx').on(table.returnId)],
);

export { returnEventKindEnum, returnEvents };
