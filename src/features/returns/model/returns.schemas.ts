import { z } from 'zod';

const MAX_TRACES = 60;
const MAX_PATTERN_SLOTS = 64;

const traceIdSchema = z.string().min(1).max(100);
const patternSchema = z.array(z.string().max(40)).min(1).max(MAX_PATTERN_SLOTS);

const traceQuerySchema = z.discriminatedUnion('kind', [
	z.object({
		id: traceIdSchema,
		kind: z.enum(['package', 'orderId', 'externalId', 'postcode']),
		pattern: patternSchema,
	}),
	z.object({
		id: traceIdSchema,
		kind: z.literal('phone'),
		pattern: patternSchema.nullable(),
		anchored: z
			.object({ prefix: z.string().max(15), suffix: z.string().max(15) })
			.nullable(),
	}),
	z.object({
		id: traceIdSchema,
		kind: z.literal('name'),
		prefixes: z.array(z.string().min(1).max(40)).min(1).max(6),
	}),
]);

const searchOrdersRequestSchema = z.object({
	traces: z.array(traceQuerySchema).max(MAX_TRACES),
});

type SearchOrdersRequest = z.output<typeof searchOrdersRequestSchema>;

export { type SearchOrdersRequest, searchOrdersRequestSchema };
