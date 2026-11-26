import { z } from 'zod';
import { MAX_INTEGER_ID } from '@/features/returns/model/returns.constants';

const returnPageParamsSchema = z.object({
	returnId: z.coerce.number().int().positive().max(MAX_INTEGER_ID),
});

const returnPageSearchParamsSchema = z.object({
	duplicate: z
		.literal('1')
		.transform(() => true)
		.optional()
		.catch(undefined),
});

const returnsListSearchParamsSchema = z.object({
	date: z.iso.date().optional().catch(undefined),
});

export {
	returnPageParamsSchema,
	returnPageSearchParamsSchema,
	returnsListSearchParamsSchema,
};
