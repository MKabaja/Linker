import { sql } from 'drizzle-orm';
import {
	bigint,
	check,
	index,
	integer,
	pgEnum,
	pgTable,
	varchar,
} from 'drizzle-orm/pg-core';
import { returns } from './returns.schema';

const returnItemConditionEnum = pgEnum('return_item_condition', [
	'accepted',
	'damaged',
]);

const returnItems = pgTable(
	'return_items',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		returnId: integer()
			.notNull()
			.references(() => returns.id, { onDelete: 'cascade' }),
		position: integer().notNull(),
		orderProductId: bigint({ mode: 'number' }),
		name: varchar({ length: 500 }).default('').notNull(),
		ean: varchar({ length: 50 }).default('').notNull(),
		sku: varchar({ length: 100 }).default('').notNull(),
		quantityOrdered: integer().notNull(),
		quantityReceived: integer().notNull(),
		condition: returnItemConditionEnum().default('accepted').notNull(),
	},
	(table) => [
		index('return_items_return_id_idx').on(table.returnId),
		check(
			'return_items_quantities_not_negative',
			sql`${table.quantityOrdered} >= 0 and ${table.quantityReceived} >= 0`,
		),
	],
);

export { returnItemConditionEnum, returnItems };
