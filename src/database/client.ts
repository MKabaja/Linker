import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseConfig } from './config/database.config';

const { DATABASE_URL } = getDatabaseConfig();

export const db = drizzle({
	client: postgres(DATABASE_URL),
	casing: 'snake_case',
});
