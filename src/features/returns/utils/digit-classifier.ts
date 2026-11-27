import type { ShopMatchingConfig } from '@/features/returns/model/returns.types';
import type {
	NumberTraceKind,
	Pattern,
	RawRead,
	Rect,
	TraceSource,
} from '@/features/returns/model/traces.types';
import {
	extractDpdParcelNumber,
	isInpostReturnNumber,
} from '@/features/returns/utils/carrier';
import { isShopPhone } from '@/features/returns/utils/shop-exclusions';

const PHONE_LENGTH = 9;
const MIN_PACKAGE_LENGTH = 8;
const MIN_KNOWN_PACKAGE_CHARS = 6;

type ReadContext = {
	source: TraceSource;
	bbox?: Rect;
	shop: ShopMatchingConfig;
};

type ReadOrigin = ReadContext & { text: string };

/**
 * Klasyfikuje ciąg cyfr (już jako wzorzec): `order_id` z zakresu sklepu, telefon albo numer paczki.
 * Zwraca `null` dla numeru zwrotnego InPost, telefonu sklepu (także z pomyłką OCR lub dodatkową cyfrą)
 * i zbyt krótkich lub niepewnych ciągów. Z pełnego kodu DPD bierze sam numer paczki.
 */
function classifyDigits(read: Pattern, origin: ReadOrigin): RawRead | null {
	const pattern = toDpdParcelPattern(read);
	const flat = pattern.join('');
	if (isInpostReturnNumber(flat)) {
		return null;
	}
	if (isOrderIdPattern(pattern, origin.shop)) {
		return numberRead('orderId', pattern, origin);
	}
	if (isFullyKnownDigits(pattern, flat) && isShopPhone(flat, origin.shop)) {
		return null;
	}
	if (isPhoneLike(pattern, flat)) {
		return phoneRead(pattern.slice(-PHONE_LENGTH), origin);
	}
	const knownChars = pattern.filter(Boolean).length;
	return pattern.length >= MIN_PACKAGE_LENGTH &&
		knownChars >= MIN_KNOWN_PACKAGE_CHARS
		? numberRead('package', pattern, origin)
		: null;
}

function isOrderIdPattern(pattern: Pattern, shop: ShopMatchingConfig): boolean {
	const head = pattern.slice(0, shop.orderIdPrefix.length).join('');
	return pattern.length === shop.orderIdLength && head === shop.orderIdPrefix;
}

function numberRead(
	kind: NumberTraceKind,
	pattern: Pattern,
	{ source, bbox, text }: ReadOrigin,
): RawRead {
	return { kind, source, text, bbox, query: { id: '', kind, pattern } };
}

function toDpdParcelPattern(pattern: Pattern): Pattern {
	const isFullyKnown = pattern.every((slot) => slot.length === 1);
	const parcelNumber = isFullyKnown
		? extractDpdParcelNumber(pattern.join(''))
		: null;
	return parcelNumber ? [...parcelNumber] : pattern;
}

function isFullyKnownDigits(pattern: Pattern, flat: string): boolean {
	return flat.length === pattern.length && /^\d+$/.test(flat);
}

function isPhoneLike(pattern: Pattern, flat: string): boolean {
	const isPhoneLength =
		pattern.length === PHONE_LENGTH ||
		(pattern.length === PHONE_LENGTH + 2 && flat.startsWith('48'));
	return isPhoneLength && /^\d*$/.test(flat);
}

function phoneRead(
	pattern: Pattern,
	{ source, bbox, text }: ReadOrigin,
): RawRead {
	return {
		kind: 'phone',
		source,
		text,
		bbox,
		query: { id: '', kind: 'phone', pattern, anchored: null },
	};
}

export {
	classifyDigits,
	isOrderIdPattern,
	MIN_PACKAGE_LENGTH,
	numberRead,
	type ReadContext,
	type ReadOrigin,
};
