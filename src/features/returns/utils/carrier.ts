import { normalizeCode } from '@/features/returns/utils/normalize-text';

const INPOST_RETURN_PREFIX = '620999669102333';
const INPOST_RETURN_NUMBER = /^62099966\d\d02333/;
const DPD_FULL_CODE = /^\d{7}(\d{13}[A-Z])\d{6}$/;

type Carrier =
	| 'inpost'
	| 'inpost-zwrot'
	| 'dpd'
	| 'dhl'
	| 'poczta-polska'
	| 'dhl-lub-gls'
	| 'gls'
	| 'orlen'
	| 'allegro-one';

type CarrierLabelByCarrier = Record<Carrier, string>;

type CarrierRule = readonly [Carrier, readonly RegExp[]];

const carrierLabelByCarrier: CarrierLabelByCarrier = {
	inpost: 'InPost',
	'inpost-zwrot': 'InPost zwrot',
	dpd: 'DPD',
	dhl: 'DHL',
	'poczta-polska': 'Poczta Polska',
	'dhl-lub-gls': 'DHL lub GLS',
	gls: 'GLS',
	orlen: 'Orlen Paczka',
	'allegro-one': 'Allegro One',
};

const carrierRules: readonly CarrierRule[] = [
	['inpost-zwrot', [/^600000\d{18}$/]],
	['inpost', [/^[56]\d{23}$/]],
	['dpd', [/^\d{13}[A-Z]$/, DPD_FULL_CODE]],
	['allegro-one', [/^A00[A-Z0-9]{7}$/]],
	['dhl', [/^JJD\d+$/, /^3\d{10}$/, /^\d{10}$/]],
	['poczta-polska', [/^PX\d{10}$/, /^[A-Z]{2}\d{9}PL$/, /^00\d{18}$/]],
	['orlen', [/^21\d{11}$/, /^(?:ORLEN|RUCH|PO)\w+$/, /^\d{20}$/]],
	['dhl-lub-gls', [/^\d{11}$/]],
	['gls', [/^\d{12}$/, /^GLS/]],
];

const carrierTextHints: readonly (readonly [Carrier, RegExp])[] = [
	['orlen', /orlen\s*paczka/i],
	['inpost', /\binpost\b/i],
	['dhl', /\bdhl\b/i],
	['dpd', /\bdpd\b/i],
	['poczta-polska', /poczta\s*polska/i],
	['allegro-one', /allegro\s*one/i],
];

/**
 * Sprawdza, czy znormalizowany numer to numer etykiety zwrotnej InPost (`620999669102333…`).
 * BaseLinker go nie zna, więc taki numer nie jest tropem.
 *
 * @remarks
 * Zwroty Allegro przez InPost (`600000…`) BaseLinker zna, więc ta funkcja ich nie obejmuje.
 */
function isInpostReturnNumber(normalized: string): boolean {
	return (
		normalized.startsWith(INPOST_RETURN_PREFIX) ||
		INPOST_RETURN_NUMBER.test(normalized)
	);
}

/**
 * Wyciąga numer paczki DPD (`1055513876329U`) z pełnego kodu kreskowego DPD
 * (`%` + kod pocztowy 7 cyfr + numer + usługa 6 cyfr), już znormalizowanego (bez `%`).
 *
 * @returns Numer paczki albo `null`, gdy kod nie ma tego formatu.
 */
function extractDpdParcelNumber(normalized: string): string | null {
	return DPD_FULL_CODE.exec(normalized)?.[1] ?? null;
}

/**
 * Rozpoznaje przewoźnika po formacie kodu, do etykiety w UI i dziennika skanów.
 * Zwraca `null`, gdy format jest nieznany.
 *
 * @remarks
 * Reguła Orlen Paczki dla 13 cyfr zaczynających się od `21` pochodzi z jednej próbki, więc jest słaba.
 * Zwroty Allegro przez InPost (`600000…`) dają `inpost-zwrot`, choć nie są numerem z {@link isInpostReturnNumber}.
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

/**
 * Podpowiada przewoźnika z tekstu etykiety (`ORLEN PACZKA`, `InPost`, `DHL`, `DPD`, `Poczta Polska`, `Allegro One`),
 * gdy numer go nie rozstrzyga. Przy kilku nazwach wygrywa pierwsza w tej kolejności.
 */
function detectCarrierFromText(text: string): Carrier | null {
	const hint = carrierTextHints.find(([, pattern]) => pattern.test(text));
	return hint ? hint[0] : null;
}

export {
	type Carrier,
	carrierLabelByCarrier,
	detectCarrier,
	detectCarrierFromText,
	extractDpdParcelNumber,
	isInpostReturnNumber,
};
