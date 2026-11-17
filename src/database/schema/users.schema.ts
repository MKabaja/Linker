import { sql } from 'drizzle-orm';
import {
	check,
	integer,
	pgEnum,
	pgTable,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core';

const userRoleEnum = pgEnum('user_role', ['employee', 'admin']);

const users = pgTable(
	'users',
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		email: varchar({ length: 255 }).unique().notNull(),
		name: varchar({ length: 255 }).notNull(),
		passwordHash: varchar({ length: 255 }).notNull(),
		role: userRoleEnum().default('employee').notNull(),
		deactivatedAt: timestamp({ withTimezone: true }),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp({ withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		check('users_email_lowercase', sql`${table.email} = lower(${table.email})`),
	],
);

export { userRoleEnum, users };
