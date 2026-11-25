import 'server-only';
import { hash } from '@node-rs/argon2';
import type { NewUser } from '@/features/auth/model/auth.schemas';
import { insertUser } from '@/features/auth/server/repositories/users.repository';

type CreateUserResult =
	| { status: 'created'; id: number }
	| { status: 'emailTaken' };

export async function createUser(newUser: NewUser): Promise<CreateUserResult> {
	const passwordHash = await hash(newUser.password);
	const insertedUser = await insertUser({
		name: newUser.name,
		email: newUser.email,
		passwordHash,
		role: newUser.role,
	});

	if (!insertedUser) {
		return { status: 'emailTaken' };
	}

	return { status: 'created', id: insertedUser.id };
}
