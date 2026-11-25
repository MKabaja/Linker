import type {
	IndexedOrder,
	ScoreDecision,
} from '@/features/returns/model/order-scoring.types';
import type { ShopMatchingConfig } from '@/features/returns/model/returns.types';

const DATE_BONUS_BITS = 0.5;
const STATUS_BONUS_BITS = 0.5;
const BONUS_MIN_DAYS = 2;
const BONUS_MAX_DAYS = 40;
const AUTO_MARGIN_BITS = 3;
const CANDIDATE_RATIO = 0.4;
const MAX_CANDIDATES = 3;
const MILLISECONDS_PER_DAY = 86_400_000;
const MILLISECONDS_PER_SECOND = 1000;

type RankedOrder = { orderIndex: number; bits: number };

type BonusContext = { nowMs: number; shop: ShopMatchingConfig };

/**
 * Zwraca najwyżej 3 najlepsze zamówienia malejąco po bitach, bez sortowania wszystkich.
 */
function rankTopOrders(
	orderIndices: number[],
	bitsOf: (orderIndex: number) => number,
): RankedOrder[] {
	const top: RankedOrder[] = [];
	for (const orderIndex of orderIndices) {
		const bits = bitsOf(orderIndex);
		const isBetterThanLast =
			top.length < MAX_CANDIDATES || bits > top[top.length - 1].bits;
		if (!isBetterThanLast) {
			continue;
		}
		top.push({ orderIndex, bits });
		top.sort((left, right) => right.bits - left.bits);
		if (top.length > MAX_CANDIDATES) {
			top.pop();
		}
	}
	return top;
}

/**
 * Zwraca `auto`, gdy najlepszy ma co najmniej `threshold` bitów i 3 bity przewagi nad drugim,
 * `candidates` od 40% progu, inaczej `none`.
 */
function decide(top: RankedOrder[], threshold: number): ScoreDecision {
	const best = top[0]?.bits ?? 0;
	const second = top[1]?.bits ?? 0;
	if (best >= threshold && best - second >= AUTO_MARGIN_BITS) {
		return 'auto';
	}
	return best >= threshold * CANDIDATE_RATIO ? 'candidates' : 'none';
}

/**
 * Zwraca premię: 0,5 bitu za potwierdzenie sprzed 2–40 dni i 0,5 za status z grupy „Wysyłka”.
 */
function bonusBits(order: IndexedOrder, { nowMs, shop }: BonusContext): number {
	const dateSeconds = order.dateConfirmed || order.dateAdd;
	const ageInDays =
		(nowMs - dateSeconds * MILLISECONDS_PER_SECOND) / MILLISECONDS_PER_DAY;
	const isRecent =
		dateSeconds > 0 &&
		ageInDays >= BONUS_MIN_DAYS &&
		ageInDays <= BONUS_MAX_DAYS;
	const isShipped = shop.shippingStatusIds.includes(order.statusId);
	return (isRecent ? DATE_BONUS_BITS : 0) + (isShipped ? STATUS_BONUS_BITS : 0);
}

export {
	type BonusContext,
	bonusBits,
	decide,
	type RankedOrder,
	rankTopOrders,
};
