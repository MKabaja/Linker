'use server';

import { revalidatePath } from 'next/cache';
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
	RestoreReturnResult,
	UpdateReturnResult,
} from '@/features/returns/model/returns.types';
import {
	type ScanLogInput,
	scanLogInputSchema,
} from '@/features/returns/model/scan-log.schemas';
import type { SaveScanLogResult } from '@/features/returns/model/scan-log.types';
import {
	createReturn,
	deleteReturn,
	restoreReturn,
	updateReturn,
} from '@/features/returns/server/services/returns.service';
import { saveScanLog } from '@/features/returns/server/services/scan-log.service';

type InvalidInput = { status: 'invalid' };

async function createReturnAction(
	input: CreateReturnInput,
): Promise<CreateReturnResult | InvalidInput> {
	const user = await requireUser();
	const parsedInput = createReturnSchema.safeParse(input);

	if (!parsedInput.success) {
		return { status: 'invalid' };
	}

	const result = await createReturn({
		orderId: parsedInput.data.orderId,
		userId: user.id,
		matchedBy: parsedInput.data.matchedBy,
		scannedLabel: parsedInput.data.scannedLabel ?? null,
		now: new Date(),
	});

	if (result.status === 'created') {
		revalidatePath('/returns');
	}

	return result;
}

async function updateReturnAction(
	input: UpdateReturnInput,
): Promise<UpdateReturnResult | InvalidInput> {
	const user = await requireUser();
	const parsedInput = updateReturnSchema.safeParse(input);

	if (!parsedInput.success) {
		return { status: 'invalid' };
	}

	const result = await updateReturn({
		update: parsedInput.data,
		userId: user.id,
		now: new Date(),
	});

	if (result.status === 'updated') {
		revalidatePath('/returns');
		revalidatePath(`/returns/${parsedInput.data.returnId}`);
	}

	return result;
}

async function deleteReturnAction(
	input: ReturnIdInput,
): Promise<DeleteReturnResult | InvalidInput> {
	const user = await requireUser();
	const parsedInput = returnIdSchema.safeParse(input);

	if (!parsedInput.success) {
		return { status: 'invalid' };
	}

	const { returnId } = parsedInput.data;
	const result = await deleteReturn({
		returnId,
		userId: user.id,
		now: new Date(),
	});

	if (result.status === 'deleted') {
		revalidatePath('/returns');
		revalidatePath(`/returns/${returnId}`);
	}

	return result;
}

async function restoreReturnAction(
	input: ReturnIdInput,
): Promise<RestoreReturnResult | InvalidInput> {
	const user = await requireUser();
	const parsedInput = returnIdSchema.safeParse(input);

	if (!parsedInput.success) {
		return { status: 'invalid' };
	}

	const { returnId } = parsedInput.data;
	const result = await restoreReturn({
		returnId,
		userId: user.id,
		now: new Date(),
	});

	if (result.status === 'restored') {
		revalidatePath('/returns');
		revalidatePath(`/returns/${returnId}`);
	}

	return result;
}

async function saveScanLogAction(
	input: ScanLogInput,
): Promise<SaveScanLogResult> {
	const user = await requireUser();
	const parsedInput = scanLogInputSchema.safeParse(input);

	if (!parsedInput.success) {
		return { status: 'invalid' };
	}

	await saveScanLog({ scanLog: parsedInput.data, userId: user.id });
	return { status: 'saved' };
}

export {
	createReturnAction,
	deleteReturnAction,
	restoreReturnAction,
	saveScanLogAction,
	updateReturnAction,
};
