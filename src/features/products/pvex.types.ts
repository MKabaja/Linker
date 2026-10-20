import type { PVEX_CSV_HEADERS } from './pvex.constants';

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

/**
 * Surowy wiersz pliku CSV z PVEX, przed konwersją na `PvexProduct`.
 * Klucze odpowiadają nagłówkom pliku, a wartości są tekstem.
 *
 * @example
 * {
 *   Nazwa: 'Żel pod prysznic 200ml',
 *   Cena: '24.9',
 *   EAN: '085715166012',
 *   Ilosc: '3',
 *   StawkaVAT: '23',
 * }
 */
export type PvexCsvRow = Record<(typeof PVEX_CSV_HEADERS)[number], string>;
