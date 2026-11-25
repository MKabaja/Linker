import 'server-only';
import { z } from 'zod';

const looseString = z.preprocess(
	(value) => (value === null || value === undefined ? '' : String(value)),
	z.string(),
);

const baseLinkerProductSchema = z.object({
	order_product_id: z.coerce.number().int().optional(),
	product_id: looseString,
	name: looseString,
	ean: looseString,
	sku: looseString,
	quantity: z.coerce.number(),
});

const baseLinkerOrderSchema = z.object({
	order_id: z.coerce.number().int().positive(),
	external_order_id: looseString,
	order_source: looseString,
	order_source_id: z.coerce.number().int().catch(0),
	order_status_id: z.coerce.number().int().catch(0),
	date_add: z.coerce.number().int(),
	date_confirmed: z.coerce.number().int().catch(0),
	phone: looseString,
	delivery_fullname: looseString,
	invoice_fullname: looseString,
	delivery_postcode: looseString,
	delivery_city: looseString,
	delivery_package_module: looseString,
	delivery_package_nr: looseString,
	products: z.array(baseLinkerProductSchema).default([]),
});

const getOrdersResponseSchema = z.object({
	orders: z.array(baseLinkerOrderSchema),
});

const baseLinkerPackageSchema = z.object({
	courier_package_nr: looseString,
	courier_inner_number: looseString,
	courier_code: looseString,
});

const getOrderPackagesResponseSchema = z.object({
	packages: z.array(baseLinkerPackageSchema),
});

const getOrderStatusListResponseSchema = z.object({
	statuses: z.array(
		z.object({ id: z.coerce.number().int(), name: looseString }),
	),
});

type BaseLinkerOrder = z.infer<typeof baseLinkerOrderSchema>;
type BaseLinkerPackage = z.infer<typeof baseLinkerPackageSchema>;
type BaseLinkerOrderStatus = z.infer<
	typeof getOrderStatusListResponseSchema
>['statuses'][number];

export {
	type BaseLinkerOrder,
	type BaseLinkerOrderStatus,
	type BaseLinkerPackage,
	getOrderPackagesResponseSchema,
	getOrderStatusListResponseSchema,
	getOrdersResponseSchema,
};
