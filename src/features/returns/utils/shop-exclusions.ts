import { defaultShopMatchingConfig } from '@/features/returns/model/returns.constants';
import type { ShopMatchingConfig } from '@/features/returns/model/returns.types';
import type { TraceQuery } from '@/features/returns/model/traces.types';
import { foldPolishText } from '@/features/returns/utils/normalize-text';

const POSTCODE_HEAD_LENGTH = 2;

const shopTextPatternsByConfig = new WeakMap<ShopMatchingConfig, RegExp[]>();

/**
 * Sprawdza, czy linia tekstu zawiera adres lub nazwę sklepu. Taka linia nie jest źródłem tropów.
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
 * Sprawdza, czy trop wskazuje na sklep (telefon z końcówką sklepu, kod pocztowy sklepu).
 */
function isShopTrace(
	query: TraceQuery,
	shop: ShopMatchingConfig = defaultShopMatchingConfig,
): boolean {
	if (query.kind === 'phone') {
		if (query.pattern) {
			const tail = query.pattern.slice(-shop.phoneSuffix.length).join('');
			return tail === shop.phoneSuffix;
		}
		return query.anchored?.suffix.endsWith(shop.phoneSuffix) ?? false;
	}
	if (query.kind === 'postcode') {
		return query.pattern.join('') === shop.postcode;
	}
	return false;
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
	return new RegExp(`\\b${escapeRegExp(foldPolishText(marker))}\\b`);
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { isShopPhone, isShopText, isShopTrace };
