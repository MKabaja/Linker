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
	type ScanLogInput,
	scanLogInputSchema,
} from '@/features/returns/model/scan-log.schemas';
import type { SaveScanLogResult } from '@/features/returns/model/scan-log.types';
import {
	createReturn,
	deleteReturn,
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

	return createReturn({
		orderId: parsedInput.data.orderId,
		userId: user.id,
		matchedBy: parsedInput.data.matchedBy,
		scannedLabel: parsedInput.data.scannedLabel ?? null,
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
	saveScanLogAction,
	updateReturnAction,
};
