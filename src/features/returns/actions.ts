'use server';

import { requireUser } from '@/features/auth/server/services/current-user.service';
import {
	type CreateReturnInput,
	createReturnSchema,
	type ReturnIdInput,
	returnIdSchema,
	type UpdateReturnInput,
	updateReturnSchema,
} from '@/features/returns/model/returns.schemas';
import type {
	CreateReturnResult,
	DeleteReturnResult,
	UpdateReturnResult,
} from '@/features/returns/model/returns.types';
import {
	createReturn,
	deleteReturn,
	updateReturn,
} from '@/features/returns/server/services/returns.service';

type InvalidInput = { status: 'invalid' };

async function createReturnAction(
	input: CreateReturnInput,
): Promise<CreateReturnResult | InvalidInput> {
	const user = await requireUser();
	const parsedInput = createReturnSchema.safeParse(input);

	if (!parsedInput.success) {
		return { status: 'invalid' };
	}

	return createReturn({
		orderId: parsedInput.data.orderId,
		userId: user.id,
		now: new Date(),
	});
}

async function updateReturnAction(
	input: UpdateReturnInput,
): Promise<UpdateReturnResult | InvalidInput> {
	const user = await requireUser();
	const parsedInput = updateReturnSchema.safeParse(input);

	if (!parsedInput.success) {
		return { status: 'invalid' };
	}

	return updateReturn({
		update: parsedInput.data,
		userId: user.id,
		now: new Date(),
	});
}

async function deleteReturnAction(
	input: ReturnIdInput,
): Promise<DeleteReturnResult | InvalidInput> {
	await requireUser();
	const parsedInput = returnIdSchema.safeParse(input);

	if (!parsedInput.success) {
		return { status: 'invalid' };
	}

	return deleteReturn(parsedInput.data.returnId);
}

export { createReturnAction, deleteReturnAction, updateReturnAction };
