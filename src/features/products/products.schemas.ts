import { z } from 'zod';

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
	q: z.string().trim().max(100).catch(''),
	page: z.coerce.number().int().min(1).catch(1),
});
