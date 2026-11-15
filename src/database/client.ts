import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import { getDatabaseConfig } from './config/database.config';

const { DATABASE_URL } = getDatabaseConfig();

export const db = drizzle({
	connection: { url: DATABASE_URL },
	casing: 'snake_case',
});
