import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';
import { getDatabaseConfig } from './database.config';

loadEnvConfig(process.cwd());
const { DATABASE_URL } = getDatabaseConfig();

export default defineConfig({
	out: 'src/database/migrations',
	schema: 'src/database/schema/*.schema.ts',
	dialect: 'postgresql',
	casing: 'snake_case',
	migrations: {
		prefix: 'timestamp',
	},
	dbCredentials: {
		url: DATABASE_URL,
	},
});
