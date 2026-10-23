import { z } from 'zod';
import { PRODUCTS_SEARCH_MAX_LENGTH } from './products.constants';

const digitsOnly = z.string().regex(/^\d+$/);
const nonNegativeInteger = digitsOnly.transform(Number);
const nonNegativeDecimal = z
	.string()
	.regex(/^\d+(\.\d+)?$/)
	.transform(Number);

export const primaveraCsvRowSchema = z.object({
	Nazwa: z.string().trim().min(1),
	Cena: nonNegativeDecimal,
	EAN: digitsOnly,
	Ilosc: nonNegativeInteger,
	StawkaVAT: nonNegativeInteger,
});

export const productsSearchParamsSchema = z.object({
	q: z.string().trim().max(PRODUCTS_SEARCH_MAX_LENGTH).catch(''),
	page: z.coerce.number().int().min(1).catch(1),
});
