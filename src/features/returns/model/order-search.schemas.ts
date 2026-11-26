import { z } from 'zod';

const traceKindSchema = z.enum([
	'package',
	'orderId',
	'externalId',
	'phone',
	'name',
	'postcode',
]);

const searchCandidateSchema = z.object({
	orderId: z.number(),
	bits: z.number(),
	reasons: z.array(
		z.object({
			traceId: z.string(),
			kind: traceKindSchema,
			bits: z.number(),
			label: z.string(),
		}),
	),
	existingReturn: z
		.object({
			returnId: z.number(),
			receivedAt: z.string(),
			receivedByName: z.string(),
			deletedAt: z.string().nullish(),
			deletedByName: z.string().nullish(),
		})
		.nullable(),
});

const searchResponseSchema = z.object({
	decision: z.enum(['auto', 'candidates', 'none']),
	threshold: z.number(),
	candidates: z.array(searchCandidateSchema),
	traces: z.array(
		z.object({ traceId: z.string(), matches: z.number(), bits: z.number() }),
	),
	indexSize: z.number(),
});

export { searchResponseSchema };
