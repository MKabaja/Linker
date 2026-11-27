import { z } from 'zod';
import { MAX_INTEGER_ID } from '@/features/returns/model/returns.constants';
import {
	defaultReturnsListFilters,
	RETURNS_CORRECTION_FILTERS,
	RETURNS_SORTS,
} from '@/features/returns/model/returns-list.constants';

const returnPageParamsSchema = z.object({
	returnId: z.coerce.number().int().positive().max(MAX_INTEGER_ID),
});

const returnsListSearchParamsSchema = z.object({
	date: z.iso.date().optional().catch(undefined),
	sort: z.enum(RETURNS_SORTS).catch(defaultReturnsListFilters.sort),
	correction: z
		.enum(RETURNS_CORRECTION_FILTERS)
		.catch(defaultReturnsListFilters.correction),
});

const returnPageSearchParamsSchema = returnsListSearchParamsSchema.extend({
	duplicate: z
		.literal('1')
		.transform(() => true)
		.optional()
		.catch(undefined),
});

const returnsSortSchema = z.enum(RETURNS_SORTS);

export {
	returnPageParamsSchema,
	returnPageSearchParamsSchema,
	returnsListSearchParamsSchema,
	returnsSortSchema,
};
