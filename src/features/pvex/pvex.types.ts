/**
 * Produkt z cennika PVEX.
 *
 * @property ean - kod kreskowy jako tekst, bo zera wiodące są znaczące
 * @property name - nazwa z pliku
 * @property searchableName - `name` małymi literami i bez polskich znaków, do wyszukiwania
 * @property price - cena w złotych
 * @property quantity - stan magazynowy w sztukach
 * @property vat - stawka VAT w procentach
 *
 * @example
 * {
 *   ean: '085715166012',
 *   name: 'Żel pod prysznic 200ml',
 *   searchableName: 'zel pod prysznic 200ml',
 *   price: 24.9,
 *   quantity: 3,
 *   vat: 23,
 * }
 */
export type PvexProduct = {
	ean: string;
	name: string;
	searchableName: string;
	price: number;
	quantity: number;
	vat: number;
};
