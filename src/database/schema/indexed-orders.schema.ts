import {
	bigint,
	index,
	integer,
	pgTable,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core';

export const indexedOrders = pgTable(
	'indexed_orders',
	{
		orderId: bigint({ mode: 'number' }).primaryKey(),
		externalOrderId: varchar({ length: 100 }).default('').notNull(),
		orderSource: varchar({ length: 50 }).default('').notNull(),
		orderSourceId: integer().default(0).notNull(),
		orderStatusId: integer().default(0).notNull(),
		dateAdd: timestamp({ withTimezone: true }).notNull(),
		dateConfirmed: timestamp({ withTimezone: true }),
		firstNameNormalized: varchar({ length: 100 }).default('').notNull(),
		lastNameNormalized: varchar({ length: 100 }).default('').notNull(),
		phoneDigits: varchar({ length: 9 }).default('').notNull(),
		postcode: varchar({ length: 10 }).default('').notNull(),
		cityNormalized: varchar({ length: 100 }).default('').notNull(),
		packagesSyncedAt: timestamp({ withTimezone: true }),
		syncedAt: timestamp({ withTimezone: true }).notNull(),
	},
	(table) => [
		index('indexed_orders_date_confirmed_idx').on(table.dateConfirmed),
		index('indexed_orders_external_order_id_idx').on(table.externalOrderId),
		index('indexed_orders_order_source_idx').on(table.orderSource),
	],
);
