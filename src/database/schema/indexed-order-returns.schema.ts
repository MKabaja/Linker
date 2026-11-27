import {
	bigint,
	index,
	integer,
	jsonb,
	pgTable,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core';

type IndexedOrderReturnProduct = {
	name: string;
	ean: string;
	sku: string;
	quantity: number;
};

export const indexedOrderReturns = pgTable(
	'indexed_order_returns',
	{
		returnId: bigint({ mode: 'number' }).primaryKey(),
		orderId: bigint({ mode: 'number' }).notNull(),
		referenceNumber: varchar({ length: 100 }).default('').notNull(),
		packageNumber: varchar({ length: 100 }).default('').notNull(),
		packageModule: varchar({ length: 50 }).default('').notNull(),
		source: varchar({ length: 50 }).default('').notNull(),
		statusId: integer().default(0).notNull(),
		fullName: varchar({ length: 200 }).default('').notNull(),
		postcode: varchar({ length: 10 }).default('').notNull(),
		products: jsonb().$type<IndexedOrderReturnProduct[]>().notNull(),
		dateAdd: timestamp({ withTimezone: true }).notNull(),
		syncedAt: timestamp({ withTimezone: true }).notNull(),
	},
	(table) => [
		index('indexed_order_returns_reference_number_idx').on(
			table.referenceNumber,
		),
		index('indexed_order_returns_package_number_idx').on(table.packageNumber),
		index('indexed_order_returns_order_id_idx').on(table.orderId),
	],
);

export type { IndexedOrderReturnProduct };
