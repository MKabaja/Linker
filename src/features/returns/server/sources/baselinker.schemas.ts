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
	extra_field_1: looseString,
	custom_extra_fields: z.record(z.string(), looseString).catch({}),
	products: z.array(baseLinkerProductSchema).default([]),
});

const getOrdersResponseSchema = z.object({
	orders: z.array(baseLinkerOrderSchema),
});

const baseLinkerPackageSchema = z.object({
	courier_package_nr: looseString,
	courier_inner_number: looseString,
	courier_code: looseString,
	package_type: looseString,
});

const getOrderPackagesResponseSchema = z.object({
	packages: z.array(baseLinkerPackageSchema),
});

const baseLinkerOrderCustomerSchema = z.object({
	user_login: looseString,
	phone: looseString,
	email: looseString,
	delivery_method: looseString,
	delivery_fullname: looseString,
	delivery_company: looseString,
	delivery_address: looseString,
	delivery_city: looseString,
	delivery_postcode: looseString,
	delivery_country_code: looseString,
	delivery_point_name: looseString,
	delivery_point_address: looseString,
	delivery_point_city: looseString,
	delivery_point_postcode: looseString,
	payment_method: looseString,
});

const getOrderCustomersResponseSchema = z.object({
	orders: z.array(baseLinkerOrderCustomerSchema),
});

const baseLinkerPickPackEntrySchema = z.object({
	action_type: z.coerce.number().int(),
	profile_id: looseString,
	entry_date: z.coerce.number().int(),
});

const getOrderPickPackHistoryResponseSchema = z.object({
	history: z.array(baseLinkerPickPackEntrySchema).default([]),
});

const baseLinkerShipmentSchema = z.object({
	package_id: z.coerce.number().int(),
	tracking_status: z.coerce.number().int().catch(0),
	tracking_status_date: z.coerce.number().int().catch(0),
	is_return: z.preprocess(
		(value) => value === true || value === 1 || value === '1',
		z.boolean(),
	),
});

const getOrderShipmentsResponseSchema = z.object({
	packages: z.array(baseLinkerShipmentSchema),
});

const baseLinkerStatusEventSchema = z.object({
	tracking_status: z.coerce.number().int().catch(0),
	tracking_status_date: z.coerce.number().int().catch(0),
});

const getCourierPackagesStatusHistoryResponseSchema = z.object({
	packages_history: z
		.record(z.string(), z.array(baseLinkerStatusEventSchema))
		.catch({}),
});

const getOrderStatusListResponseSchema = z.object({
	statuses: z.array(
		z.object({ id: z.coerce.number().int(), name: looseString }),
	),
});

const baseLinkerJournalLogSchema = z.object({
	log_id: z.coerce.number().int().positive(),
	log_type: z.coerce.number().int(),
	order_id: z.coerce.number().int(),
});

const getJournalListResponseSchema = z.object({
	logs: z.array(baseLinkerJournalLogSchema).default([]),
});

const baseLinkerOrderReturnProductSchema = z.object({
	name: looseString,
	sku: looseString,
	ean: looseString,
	quantity: z.coerce.number(),
});

const baseLinkerOrderReturnSchema = z.object({
	return_id: z.coerce.number().int().positive(),
	order_id: z.coerce.number().int(),
	reference_number: looseString,
	order_return_source: looseString,
	status_id: z.coerce.number().int().catch(0),
	date_add: z.coerce.number().int(),
	delivery_fullname: looseString,
	delivery_postcode: looseString,
	delivery_package_module: looseString,
	delivery_package_nr: looseString,
	products: z.array(baseLinkerOrderReturnProductSchema).default([]),
});

const getOrderReturnsResponseSchema = z.object({
	returns: z.array(baseLinkerOrderReturnSchema).default([]),
});

const emptyArrayAsRecord = (value: unknown) =>
	Array.isArray(value) ? {} : value;

const baseLinkerProductImagesSchema = z.object({
	ean: looseString,
	images: z
		.preprocess(emptyArrayAsRecord, z.record(z.string(), looseString))
		.catch({}),
});

const getInventoryProductsDataResponseSchema = z.object({
	products: z.preprocess(
		emptyArrayAsRecord,
		z.record(z.string(), baseLinkerProductImagesSchema),
	),
});

type BaseLinkerOrder = z.infer<typeof baseLinkerOrderSchema>;
type BaseLinkerJournalLog = z.infer<typeof baseLinkerJournalLogSchema>;
type BaseLinkerProductImages = z.infer<typeof baseLinkerProductImagesSchema>;
type BaseLinkerOrderReturn = z.infer<typeof baseLinkerOrderReturnSchema>;
type BaseLinkerPackage = z.infer<typeof baseLinkerPackageSchema>;
type BaseLinkerOrderCustomer = z.infer<typeof baseLinkerOrderCustomerSchema>;
type BaseLinkerPickPackEntry = z.infer<typeof baseLinkerPickPackEntrySchema>;
type BaseLinkerShipment = z.infer<typeof baseLinkerShipmentSchema>;
type BaseLinkerStatusEvent = z.infer<typeof baseLinkerStatusEventSchema>;
type BaseLinkerOrderStatus = z.infer<
	typeof getOrderStatusListResponseSchema
>['statuses'][number];

export {
	type BaseLinkerJournalLog,
	type BaseLinkerOrder,
	type BaseLinkerOrderCustomer,
	type BaseLinkerOrderReturn,
	type BaseLinkerOrderStatus,
	type BaseLinkerPackage,
	type BaseLinkerPickPackEntry,
	type BaseLinkerProductImages,
	type BaseLinkerShipment,
	type BaseLinkerStatusEvent,
	getCourierPackagesStatusHistoryResponseSchema,
	getInventoryProductsDataResponseSchema,
	getJournalListResponseSchema,
	getOrderCustomersResponseSchema,
	getOrderPackagesResponseSchema,
	getOrderPickPackHistoryResponseSchema,
	getOrderReturnsResponseSchema,
	getOrderShipmentsResponseSchema,
	getOrderStatusListResponseSchema,
	getOrdersResponseSchema,
};
