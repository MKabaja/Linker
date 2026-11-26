import { defaultShopMatchingConfig } from '@/features/returns/model/returns.constants';
import type { ShopMatchingConfig } from '@/features/returns/model/returns.types';
import type {
	Pattern,
	PhoneTraceQuery,
	TraceQuery,
} from '@/features/returns/model/traces.types';
import { foldPolishText } from '@/features/returns/utils/normalize-text';
import { countDiffs } from '@/features/returns/utils/pattern-cost';

const POSTCODE_HEAD_LENGTH = 2;
const MAX_SHOP_POSTCODE_DIFFS = 1;
const MIN_GLUED_MARKER_LENGTH = 5;
const MARKER_GAP = '[^a-z0-9]*';

const shopTextPatternsByConfig = new WeakMap<ShopMatchingConfig, RegExp[]>();

/**
 * Sprawdza, czy linia tekstu zawiera adres lub nazwę sklepu. Taka linia nie jest źródłem tropów.
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
 * Sprawdza, czy 9 cyfr (albo 11 z prefiksem `48`) to telefon sklepu.
 */
function isShopPhone(
	digits: string,
	shop: ShopMatchingConfig = defaultShopMatchingConfig,
): boolean {
	const phone =
		digits.length === 11 && digits.startsWith('48') ? digits.slice(2) : digits;
	return /^\d{9}$/.test(phone) && phone.endsWith(shop.phoneSuffix);
}

/**
 * Sprawdza, czy trop wskazuje na sklep: telefon sklepu, kod pocztowy sklepu albo zamaskowaną nazwę sklepu.
 *
 * @remarks
 * - Kod pocztowy różniący się od kodu sklepu na jednej pozycji też jest kodem sklepu (pomyłka OCR).
 * - Maska telefonu, której jedyne znane cyfry to koniec będący fragmentem końcówki sklepu (`…909`, `…93`), jest telefonem sklepu.
 */
function isShopTrace(
	query: TraceQuery,
	shop: ShopMatchingConfig = defaultShopMatchingConfig,
): boolean {
	if (query.kind === 'phone') {
		return isShopPhoneMask(query, shop.phoneSuffix);
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

function isShopPhoneMask(query: PhoneTraceQuery, phoneSuffix: string): boolean {
	const hasShopSuffix = query.pattern
		? query.pattern.slice(-phoneSuffix.length).join('') === phoneSuffix
		: (query.anchored?.suffix.endsWith(phoneSuffix) ?? false);
	const tail = knownTailOnly(query);
	return hasShopSuffix || (tail !== null && phoneSuffix.includes(tail));
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
