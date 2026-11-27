import { bigint, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const productImages = pgTable('product_images', {
	productId: bigint({ mode: 'number' }).primaryKey(),
	ean: varchar({ length: 50 }).default('').notNull(),
	imageUrl: text().default('').notNull(),
	syncedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
