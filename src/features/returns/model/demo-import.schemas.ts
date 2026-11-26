import { z } from 'zod';
import { RETURN_NOTE_MAX_LENGTH } from '@/features/returns/model/returns.constants';

const MAX_ITEM_QUANTITY = 10_000;
const MAX_RETURN_ITEMS = 200;

const quantitySchema = z.number().int().min(0).max(MAX_ITEM_QUANTITY);

const timestampSchema = z
	.union([z.number().int().positive(), z.iso.datetime({ offset: true })])
	.transform((value) => new Date(value))
	.refine((date) => !Number.isNaN(date.getTime()));

const demoReturnSchema = z.object({
	orderId: z.number().int().positive(),
	source: z.string().max(50),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
	note: z.string().max(RETURN_NOTE_MAX_LENGTH).default(''),
	items: z
		.array(
			z.object({
				key: z.string().max(50),
				name: z.string().max(500),
				ean: z.string().max(50),
				sku: z.string().max(100),
				quantityOrdered: quantitySchema,
				quantityReceived: quantitySchema,
			}),
		)
		.max(MAX_RETURN_ITEMS),
});

/** Plik `returns.json` z demo: tablica rekordów albo obiekt z rekordami jako wartościami. */
const demoReturnsFileSchema = z
	.union([z.array(z.unknown()), z.record(z.string(), z.unknown())])
	.transform((records) =>
		Array.isArray(records) ? records : Object.values(records),
	);

type DemoReturn = z.output<typeof demoReturnSchema>;

export { type DemoReturn, demoReturnSchema, demoReturnsFileSchema };
