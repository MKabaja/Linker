import {
	bigint,
	integer,
	pgTable,
	primaryKey,
	varchar,
} from 'drizzle-orm/pg-core';
import { indexedOrders } from './indexed-orders.schema';

export const indexedOrderItems = pgTable(
	'indexed_order_items',
	{
		orderId: bigint({ mode: 'number' })
			.notNull()
			.references(() => indexedOrders.orderId, { onDelete: 'cascade' }),
		position: integer().notNull(),
		orderProductId: bigint({ mode: 'number' }),
		productId: varchar({ length: 50 }).default('').notNull(),
		name: varchar({ length: 500 }).default('').notNull(),
		ean: varchar({ length: 50 }).default('').notNull(),
		sku: varchar({ length: 100 }).default('').notNull(),
		quantity: integer().default(0).notNull(),
	},
	(table) => [primaryKey({ columns: [table.orderId, table.position] })],
);
