import 'server-only';
import type { IndexedOrderItem } from '@/features/returns/model/order-index.types';
import type { ProductImageRecord } from '@/features/returns/model/product-images.types';
import type { ReturnItem } from '@/features/returns/model/returns.types';
import type { ProductImagesById } from '@/features/returns/server/sources/baselinker.client';

const PRODUCT_ID_PATTERN = /^[1-9]\d*$/;
const IMAGE_URL_PATTERN = /^https?:\/\//;

type MatchableReturnItem = Pick<
	ReturnItem,
	'id' | 'orderProductId' | 'ean' | 'sku'
>;

type ProductIdByItemId = Map<number, number>;

type ProductImageRecordsQuery = {
	productIds: number[];
	imagesById: ProductImagesById;
	syncedAt: Date;
};

/**
 * Przypisuje pozycjom zwrotu `product_id` z indeksu zamówienia: po `order_product_id`, potem po EAN, potem po SKU.
 *
 * @remarks Pozycje bez dopasowania albo z `product_id` pustym lub `0` (produkt spoza katalogu) są pomijane.
 */
function matchReturnItemProductIds(
	items: MatchableReturnItem[],
	indexedItems: IndexedOrderItem[],
): ProductIdByItemId {
	const productIdByItemId: ProductIdByItemId = new Map();

	for (const item of items) {
		const productId = parseProductId(findIndexedItem(item, indexedItems));

		if (productId !== null) {
			productIdByItemId.set(item.id, productId);
		}
	}

	return productIdByItemId;
}

/**
 * Buduje wpisy cache dla każdego żądanego produktu; brak produktu lub zdjęcia w odpowiedzi daje `imageUrl` `''`.
 */
function mapProductImageRecords({
	productIds,
	imagesById,
	syncedAt,
}: ProductImageRecordsQuery): ProductImageRecord[] {
	return productIds.map((productId) => {
		const product = imagesById[String(productId)];

		return {
			productId,
			ean: product?.ean.trim() ?? '',
			imageUrl: product ? pickFirstImageUrl(product.images) : '',
			syncedAt,
		};
	});
}

/**
 * Zwraca adres zdjęcia o najniższym numerycznym kluczu albo `''`, gdy brak poprawnego adresu http(s).
 */
function pickFirstImageUrl(imageUrlByKey: Record<string, string>): string {
	const [firstKey] = Object.keys(imageUrlByKey)
		.filter((key) => Number.isFinite(Number(key)))
		.sort((left, right) => Number(left) - Number(right));
	const imageUrl = firstKey ? (imageUrlByKey[firstKey] ?? '').trim() : '';

	return IMAGE_URL_PATTERN.test(imageUrl) ? imageUrl : '';
}

function findIndexedItem(
	item: MatchableReturnItem,
	indexedItems: IndexedOrderItem[],
): IndexedOrderItem | undefined {
	return (
		indexedItems.find(
			({ orderProductId }) =>
				item.orderProductId !== null && orderProductId === item.orderProductId,
		) ??
		indexedItems.find(({ ean }) => item.ean !== '' && ean === item.ean) ??
		indexedItems.find(({ sku }) => item.sku !== '' && sku === item.sku)
	);
}

function parseProductId(item: IndexedOrderItem | undefined): number | null {
	const productId = item?.productId.trim() ?? '';

	return PRODUCT_ID_PATTERN.test(productId) &&
		Number.isSafeInteger(Number(productId))
		? Number(productId)
		: null;
}

export {
	type MatchableReturnItem,
	mapProductImageRecords,
	matchReturnItemProductIds,
	type ProductIdByItemId,
	pickFirstImageUrl,
};
