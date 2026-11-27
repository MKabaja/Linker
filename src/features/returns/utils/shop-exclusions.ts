import { defaultShopMatchingConfig } from '@/features/returns/model/returns.constants';
import type { ShopMatchingConfig } from '@/features/returns/model/returns.types';
import type {
	Pattern,
	PhoneTraceQuery,
	TraceQuery,
} from '@/features/returns/model/traces.types';
import { foldPolishText } from '@/features/returns/utils/normalize-text';
import { countDiffs, matchCost } from '@/features/returns/utils/pattern-cost';

const POSTCODE_HEAD_LENGTH = 2;
const MAX_SHOP_POSTCODE_DIFFS = 1;
const PHONE_LENGTH = 9;
const COUNTRY_PREFIX = '48';
const MAX_SHOP_PHONE_COST = 1;
const MIN_FUZZY_TAIL_LENGTH = 4;
const MAX_SHOP_TAIL_DIFFS = 1;
const ROUTING_COUNTRY = 'PL';
const MIN_GLUED_MARKER_LENGTH = 5;
const MARKER_GAP = '[^a-z0-9]*';

const shopTextPatternsByConfig = new WeakMap<ShopMatchingConfig, RegExp[]>();

/**
 * Sprawdza, czy linia tekstu zawiera adres lub nazwę sklepu albo kod trasy z kodem pocztowym sklepu
 * (`2LPL32432+…`). Taka linia nie jest źródłem tropów.
 *
 * @remarks
 * Znaczniki od 5 znaków pasują też wewnątrz słów i z odstępami między literami (`KozackaDrogeria.pl`,
 * `K O Z A C K A`); krótsze (`pcim`, `720`) tylko jako całe słowa, żeby nie wycinać fragmentów numerów.
 */
function isShopText(
	text: string,
	shop: ShopMatchingConfig = defaultShopMatchingConfig,
): boolean {
	const folded = foldPolishText(text);
	return getShopTextPatterns(shop).some((pattern) => pattern.test(folded));
}

/**
 * Sprawdza, czy ciąg cyfr to telefon sklepu: 9 cyfr (albo 11 z prefiksem `48`) z końcówką sklepu
 * albo odczyt pełnego telefonu sklepu z jedną błędną, dodatkową lub brakującą cyfrą (`880729083`, `1880729093`).
 */
function isShopPhone(
	digits: string,
	shop: ShopMatchingConfig = defaultShopMatchingConfig,
): boolean {
	if (!/^\d+$/.test(digits)) {
		return false;
	}
	const phone =
		digits.length === PHONE_LENGTH + COUNTRY_PREFIX.length &&
		digits.startsWith(COUNTRY_PREFIX)
			? digits.slice(COUNTRY_PREFIX.length)
			: digits;
	if (phone.length === PHONE_LENGTH && phone.endsWith(shop.phoneSuffix)) {
		return true;
	}
	return [phone, phone.slice(1)].some((candidate) =>
		isNearShopPhone(candidate, shop.phone),
	);
}

/**
 * Sprawdza, czy trop wskazuje na sklep: telefon sklepu, kod pocztowy sklepu albo zamaskowaną nazwę sklepu.
 *
 * @remarks
 * - Kod pocztowy różniący się od kodu sklepu na jednej pozycji też jest kodem sklepu (pomyłka OCR).
 * - Maska telefonu, której jedyne znane cyfry to koniec będący fragmentem końcówki sklepu (`…909`, `…93`), jest telefonem sklepu;
 *   koniec od 4 cyfr może się różnić od końca telefonu sklepu jedną cyfrą (`***3 093`).
 * - Numer paczki z `PL` i kodem pocztowym sklepu (kod trasy DHL `2LPL32432…`) jest kodem sklepu.
 */
function isShopTrace(
	query: TraceQuery,
	shop: ShopMatchingConfig = defaultShopMatchingConfig,
): boolean {
	if (query.kind === 'phone') {
		return isShopPhoneMask(query, shop);
	}
	if (query.kind === 'package') {
		return query.pattern.join('').includes(ROUTING_COUNTRY + shop.postcode);
	}
	if (query.kind === 'name') {
		return isShopName(query.prefixes, shop.shopNameMasks);
	}
	if (query.kind === 'postcode') {
		const diffs = countDiffs(query.pattern, shop.postcode);
		return diffs >= 0 && diffs <= MAX_SHOP_POSTCODE_DIFFS;
	}
	return false;
}

function isNearShopPhone(digits: string, shopPhone: string): boolean {
	return (
		Math.abs(digits.length - PHONE_LENGTH) <= 1 &&
		matchCost([...shopPhone], digits, MAX_SHOP_PHONE_COST) <=
			MAX_SHOP_PHONE_COST
	);
}

function isShopPhoneMask(
	query: PhoneTraceQuery,
	{ phoneSuffix, phone }: ShopMatchingConfig,
): boolean {
	const flat = query.pattern?.join('') ?? '';
	if (
		query.pattern &&
		flat.length === PHONE_LENGTH &&
		isNearShopPhone(flat, phone)
	) {
		return true;
	}
	const hasShopSuffix = query.pattern
		? query.pattern.slice(-phoneSuffix.length).join('') === phoneSuffix
		: (query.anchored?.suffix.endsWith(phoneSuffix) ?? false);
	const tail = knownTailOnly(query);
	return (
		hasShopSuffix ||
		(tail !== null &&
			(phoneSuffix.includes(tail) || isNearShopTail(tail, phone)))
	);
}

function isNearShopTail(tail: string, shopPhone: string): boolean {
	if (tail.length < MIN_FUZZY_TAIL_LENGTH || tail.length > shopPhone.length) {
		return false;
	}
	const diffs = countDiffs([...tail], shopPhone.slice(-tail.length));
	return diffs >= 0 && diffs <= MAX_SHOP_TAIL_DIFFS;
}

function knownTailOnly({ pattern, anchored }: PhoneTraceQuery): string | null {
	if (pattern) {
		return positionalTailOnly(pattern);
	}
	return anchored && anchored.prefix === '' ? anchored.suffix : null;
}

function positionalTailOnly(pattern: Pattern): string | null {
	const firstKnown = pattern.findIndex((slot) => slot !== '');
	if (firstKnown < 0) {
		return null;
	}
	const tail = pattern.slice(firstKnown);
	return tail.every((slot) => slot.length === 1) ? tail.join('') : null;
}

function isShopName(
	prefixes: string[],
	shopNameMasks: ShopMatchingConfig['shopNameMasks'],
): boolean {
	return shopNameMasks.some(
		(mask) =>
			mask.length === prefixes.length &&
			mask.every((word, index) =>
				prefixes[index].startsWith(foldPolishText(word)),
			),
	);
}

function getShopTextPatterns(shop: ShopMatchingConfig): RegExp[] {
	const cached = shopTextPatternsByConfig.get(shop);
	if (cached) {
		return cached;
	}
	const patterns = [
		postcodeTextPattern(shop.postcode),
		routingCodeTextPattern(shop.postcode),
		...shop.textMarkers.map(markerPattern),
	];
	shopTextPatternsByConfig.set(shop, patterns);
	return patterns;
}

function postcodeTextPattern(postcode: string): RegExp {
	const head = postcode.slice(0, POSTCODE_HEAD_LENGTH);
	const tail = postcode.slice(POSTCODE_HEAD_LENGTH);
	return new RegExp(`${head}\\s*-\\s*${tail}`);
}

function routingCodeTextPattern(postcode: string): RegExp {
	return new RegExp(`${ROUTING_COUNTRY.toLowerCase()}[s-]*${postcode}`);
}

function markerPattern(marker: string): RegExp {
	const folded = foldPolishText(marker).replace(/\s+/g, '');
	if (folded.length < MIN_GLUED_MARKER_LENGTH) {
		return new RegExp(`\\b${escapeRegExp(folded)}\\b`);
	}
	return new RegExp([...folded].map(escapeRegExp).join(MARKER_GAP));
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { isShopPhone, isShopText, isShopTrace };
