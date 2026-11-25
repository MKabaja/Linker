import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const syncState = pgTable('sync_state', {
	key: varchar({ length: 100 }).primaryKey(),
	value: text().notNull(),
	updatedAt: timestamp({ withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});
