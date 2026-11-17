import { z } from 'zod';

type NewUser = z.output<typeof newUserSchema>;

const newUserSchema = z.object({
	name: z.string().trim().min(1).max(50),
	email: z.string().trim().toLowerCase().max(255).pipe(z.email()),
	password: z.string().min(8).max(64),
	role: z.enum(['employee', 'admin']).default('employee'),
});

export { type NewUser, newUserSchema };
