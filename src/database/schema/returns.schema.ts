import { sql } from 'drizzle-orm';
import {
	bigint,
	check,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

const returnMatchedByEnum = pgEnum('return_matched_by', [
	'auto',
	'manual-pick',
	'manual-entry',
	'imported',
]);

const returns = pgTable(
	'returns',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		orderId: bigint({ mode: 'number' }).notNull(),
		orderSource: varchar({ length: 50 }).default('').notNull(),
		note: text().default('').notNull(),
		receivedBy: integer().references(() => users.id, { onDelete: 'restrict' }),
		matchedBy: returnMatchedByEnum().default('manual-entry').notNull(),
		scannedLabel: varchar({ length: 64 }),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
		deletedAt: timestamp({ withTimezone: true }),
		deletedBy: integer().references(() => users.id, { onDelete: 'restrict' }),
		updatedAt: timestamp({ withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		unique('returns_order_id_unique').on(table.orderId),
		index('returns_created_at_idx').on(table.createdAt),
		check(
			'returns_received_by_required',
			sql`${table.receivedBy} is not null or ${table.matchedBy} = 'imported'`,
		),
	],
);

export { returnMatchedByEnum, returns };
