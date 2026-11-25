import {
	bigint,
	index,
	integer,
	pgTable,
	unique,
	varchar,
} from 'drizzle-orm/pg-core';
import { indexedOrders } from './indexed-orders.schema';

export const indexedPackages = pgTable(
	'indexed_packages',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		orderId: bigint({ mode: 'number' })
			.notNull()
			.references(() => indexedOrders.orderId, { onDelete: 'cascade' }),
		packageNumber: varchar({ length: 100 }).default('').notNull(),
		innerNumber: varchar({ length: 100 }).default('').notNull(),
		courierCode: varchar({ length: 50 }).default('').notNull(),
	},
	(table) => [
		unique('indexed_packages_order_package_unique').on(
			table.orderId,
			table.packageNumber,
		),
		index('indexed_packages_package_number_idx').on(table.packageNumber),
		index('indexed_packages_inner_number_idx').on(table.innerNumber),
	],
);
