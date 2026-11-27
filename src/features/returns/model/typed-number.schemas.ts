import { z } from 'zod';
import { searchOrdersRequestSchema } from '@/features/returns/model/returns.schemas';

const MAX_TYPED_TEXT_LENGTH = 64;

const typedNumberRequestSchema = z.object({
	text: z.string().trim().min(1).max(MAX_TYPED_TEXT_LENGTH),
	carrier: z
		.enum([
			'inpost',
			'inpost-zwrot',
			'dpd',
			'dhl',
			'poczta-polska',
			'dhl-lub-gls',
			'gls',
			'orlen',
			'allegro-one',
		])
		.optional(),
	traces: searchOrdersRequestSchema.shape.traces.default([]),
});

type TypedNumberRequest = z.input<typeof typedNumberRequestSchema>;

export { type TypedNumberRequest, typedNumberRequestSchema };
