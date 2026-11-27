import { z } from 'zod';
import {
	SCANNED_LABEL_MAX_LENGTH,
	SCANNER_MATCHED_BY,
} from '@/features/returns/model/return-origin.constants';
import {
	MAX_INTEGER_ID,
	RETURN_NOTE_MAX_LENGTH,
} from '@/features/returns/model/returns.constants';

const MAX_TRACES = 60;
const MAX_PATTERN_SLOTS = 64;
const MAX_ITEM_QUANTITY = 10_000;
const MAX_RETURN_ITEMS = 200;

const traceIdSchema = z.string().min(1).max(100);
const patternSchema = z.array(z.string().max(40)).min(1).max(MAX_PATTERN_SLOTS);

const traceQuerySchema = z.discriminatedUnion('kind', [
	z.object({
		id: traceIdSchema,
		kind: z.enum([
			'package',
			'orderId',
			'externalId',
			'postcode',
			'returnReference',
		]),
		pattern: patternSchema,
		isSingleOcrRead: z.boolean().optional(),
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

const idSchema = z.coerce.number().int().positive().max(MAX_INTEGER_ID);
const conditionSchema = z.enum(['accepted', 'damaged']);

const scannedLabelSchema = z
	.string()
	.transform((label) => label.replace(/\s+/g, '').toUpperCase())
	.pipe(
		z
			.string()
			.min(1)
			.max(SCANNED_LABEL_MAX_LENGTH)
			.regex(/^[A-Z0-9-]+$/),
	);

const createReturnSchema = z.object({
	orderId: idSchema,
	matchedBy: z.enum(SCANNER_MATCHED_BY).default('manual-entry'),
	scannedLabel: scannedLabelSchema.optional(),
});

const updateReturnSchema = z.object({
	returnId: idSchema,
	note: z.string().trim().max(RETURN_NOTE_MAX_LENGTH).optional(),
	items: z
		.array(
			z.object({
				id: idSchema,
				quantityReceived: z.number().int().min(0).max(MAX_ITEM_QUANTITY),
				condition: conditionSchema.optional(),
			}),
		)
		.max(MAX_RETURN_ITEMS)
		.optional(),
});

const returnIdSchema = z.object({ returnId: idSchema });

const returnCorrectionSchema = z.object({
	returnId: idSchema,
	isIssued: z.boolean(),
});

const orderIdSchema = z.object({ orderId: idSchema });

const returnsDaySchema = z.object({ date: z.iso.date() });

const returnSnapshotSchema = z.object({
	note: z.string(),
	items: z.array(
		z.object({
			id: z.number(),
			orderProductId: z.number().nullable(),
			name: z.string(),
			ean: z.string(),
			sku: z.string(),
			quantityOrdered: z.number(),
			quantityReceived: z.number(),
			condition: conditionSchema,
		}),
	),
});

type SearchOrdersRequest = z.output<typeof searchOrdersRequestSchema>;
type CreateReturnInput = z.input<typeof createReturnSchema>;
type UpdateReturnInput = z.input<typeof updateReturnSchema>;
type UpdateReturn = z.output<typeof updateReturnSchema>;
type ReturnIdInput = z.input<typeof returnIdSchema>;
type ReturnCorrectionInput = z.input<typeof returnCorrectionSchema>;

export {
	type CreateReturnInput,
	createReturnSchema,
	orderIdSchema,
	type ReturnCorrectionInput,
	type ReturnIdInput,
	returnCorrectionSchema,
	returnIdSchema,
	returnSnapshotSchema,
	returnsDaySchema,
	type SearchOrdersRequest,
	searchOrdersRequestSchema,
	type UpdateReturn,
	type UpdateReturnInput,
	updateReturnSchema,
};
