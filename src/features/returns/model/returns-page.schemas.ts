import { z } from 'zod';

const returnPageParamsSchema = z.object({
	returnId: z.coerce.number().int().positive(),
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
