import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

const userRoleEnum = pgEnum('user_role', ['employee', 'admin']);

const users = pgTable('users', {
	id: uuid().primaryKey().defaultRandom(),
	email: varchar({ length: 255 }).unique().notNull(),
	name: varchar({ length: 255 }).notNull(),
	passwordHash: varchar({ length: 255 }).notNull(),
	role: userRoleEnum().default('employee').notNull(),
	createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export { userRoleEnum, users };
