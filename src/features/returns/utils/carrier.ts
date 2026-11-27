import { normalizeCode } from '@/features/returns/utils/normalize-text';

const INPOST_RETURN_PREFIX = '620999669102333';
const INPOST_RETURN_NUMBER = /^62099966\d\d02333/;

type Carrier =
	| 'inpost'
	| 'inpost-zwrot'
	| 'dpd'
	| 'dhl'
	| 'poczta-polska'
	| 'dhl-lub-gls'
	| 'gls'
	| 'orlen';

const carrierLabelByCarrier: Record<Carrier, string> = {
	inpost: 'InPost',
	'inpost-zwrot': 'InPost zwrot',
	dpd: 'DPD',
	dhl: 'DHL',
	'poczta-polska': 'Poczta Polska',
	'dhl-lub-gls': 'DHL lub GLS',
	gls: 'GLS',
	orlen: 'Orlen Paczka',
};

const carrierRules: readonly (readonly [Carrier, readonly RegExp[]])[] = [
	['inpost', [/^6\d{23}$/]],
	['dpd', [/^\d{13}[A-Z]$/, /^%?\d{7}\d{14}\d{3}$/]],
	['dhl', [/^JJD\d+$/, /^\d{10}$/]],
	['poczta-polska', [/^[A-Z]{2}\d{9}PL$/, /^00\d{18}$/]],
	['dhl-lub-gls', [/^\d{11}$/]],
	['gls', [/^\d{12}$/, /^GLS/]],
	['orlen', [/^(?:ORLEN|RUCH|PO)\w+$/, /^\d{20}$/]],
];

/**
 * Sprawdza, czy znormalizowany numer to numer etykiety zwrotnej InPost.
 * BaseLinker go nie zna, więc taki numer nie jest tropem.
 */
function isInpostReturnNumber(normalized: string): boolean {
	return (
		normalized.startsWith(INPOST_RETURN_PREFIX) ||
		INPOST_RETURN_NUMBER.test(normalized)
	);
}

/**
 * Rozpoznaje przewoźnika po formacie kodu, tylko do dziennika skanów. Zwraca `null`, gdy format jest nieznany.
 */
function detectCarrier(code: string): Carrier | null {
	const normalized = normalizeCode(code);
	if (isInpostReturnNumber(normalized)) {
		return 'inpost-zwrot';
	}
	const rule = carrierRules.find(([, patterns]) =>
		patterns.some((pattern) => pattern.test(normalized)),
	);
	return rule ? rule[0] : null;
}

export {
	type Carrier,
	carrierLabelByCarrier,
	detectCarrier,
	isInpostReturnNumber,
};
