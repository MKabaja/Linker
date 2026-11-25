import {
	bigint,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const returns = pgTable(
	'returns',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		orderId: bigint({ mode: 'number' }).notNull(),
		orderSource: varchar({ length: 50 }).default('').notNull(),
		note: text().default('').notNull(),
		receivedBy: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp({ withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		unique('returns_order_id_unique').on(table.orderId),
		index('returns_created_at_idx').on(table.createdAt),
	],
);
