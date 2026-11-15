import { z } from 'zod';

type DatabaseConfig = z.infer<typeof databaseSchema>;

function getDatabaseConfig(): DatabaseConfig {
	const parsedDetails = databaseSchema.safeParse(process.env);

	if (!parsedDetails.success) {
		throw new Error(
			`Invalid database configuration:\n${z.prettifyError(parsedDetails.error)}`,
		);
	}

	return parsedDetails.data;
}

const databaseSchema = z.object({
	DATABASE_URL: z
		.url()
		.refine(
			(url) => url.startsWith('postgres://') || url.startsWith('postgresql://'),
			{
				message: 'DATABASE_URL must be a PostgreSQL URL',
			},
		),
});

export { type DatabaseConfig, getDatabaseConfig };
