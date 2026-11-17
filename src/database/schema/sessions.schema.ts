import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const sessions = pgTable('sessions', {
	id: varchar({ length: 64 }).primaryKey(),
	expiresAt: timestamp({ withTimezone: true }).notNull(),
	userId: integer()
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
});
