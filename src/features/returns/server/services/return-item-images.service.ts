import 'server-only';
import type {
	ImageUrlByItemId,
	ProductImageRecord,
} from '@/features/returns/model/product-images.types';
import {
	type MatchableReturnItem,
	mapProductImageRecords,
	matchReturnItemProductIds,
} from '@/features/returns/server/mappers/product-image.mapper';
import { findIndexedOrderEntry } from '@/features/returns/server/repositories/order-index.repository';
import {
	findProductImages,
	saveProductImages,
} from '@/features/returns/server/repositories/product-images.repository';
import { fetchBaseLinkerProductImages } from '@/features/returns/server/sources/baselinker.client';
import { getBaseLinkerConfig } from '@/features/returns/server/sources/baselinker.config';
import { selectStaleProductIds } from '@/features/returns/utils/product-image-freshness';

type ReturnItemImagesQuery = {
	orderId: number;
	items: MatchableReturnItem[];
};

/**
 * Zwraca adresy zdjęć produktów pozycji zwrotu (po id pozycji) z cache w bazie.
 *
 * @remarks
 * Brakujące lub starsze niż 30 dni wpisy pobiera jednym wywołaniem `getInventoryProductsData` z katalogu `BASELINKER_INVENTORY_ID`. Nie rzuca: błąd bazy lub BaseLinkera daje to, co jest w cache (albo `{}`). Pozycje bez zdjęcia lub bez `product_id` w indeksie zamówienia nie występują w wyniku.
 */
async function getReturnItemImageUrls({
	orderId,
	items,
}: ReturnItemImagesQuery): Promise<ImageUrlByItemId> {
	try {
		return await resolveImageUrls({ orderId, items });
	} catch (error) {
		console.error(
			'Nie udało się ustalić zdjęć produktów zwrotu.',
			error instanceof Error ? error.message : 'nieznany błąd',
		);

		return {};
	}
}

async function resolveImageUrls({
	orderId,
	items,
}: ReturnItemImagesQuery): Promise<ImageUrlByItemId> {
	const entry = await findIndexedOrderEntry(orderId);

	if (!entry) {
		return {};
	}

	const productIdByItemId = matchReturnItemProductIds(items, entry.items);
	const productIds = [...new Set(productIdByItemId.values())];
	const cachedRecords = await findProductImages(productIds);
	const staleProductIds = selectStaleProductIds({
		productIds,
		records: cachedRecords,
		now: new Date(),
	});
	const records = await refreshProductImages(staleProductIds, cachedRecords);
	const imageUrlByProductId = new Map(
		records.map(({ productId, imageUrl }) => [productId, imageUrl]),
	);
	const imageUrlByItemId: ImageUrlByItemId = {};

	for (const [itemId, productId] of productIdByItemId) {
		const imageUrl = imageUrlByProductId.get(productId);

		if (imageUrl) {
			imageUrlByItemId[itemId] = imageUrl;
		}
	}

	return imageUrlByItemId;
}

async function refreshProductImages(
	staleProductIds: number[],
	cachedRecords: ProductImageRecord[],
): Promise<ProductImageRecord[]> {
	if (staleProductIds.length === 0) {
		return cachedRecords;
	}

	const result = await fetchBaseLinkerProductImages({
		inventoryId: getBaseLinkerConfig().inventoryId,
		productIds: staleProductIds,
	});

	if (result.status !== 'ok') {
		return cachedRecords;
	}

	const freshRecords = mapProductImageRecords({
		productIds: staleProductIds,
		imagesById: result.data,
		syncedAt: new Date(),
	});

	await saveProductImages(freshRecords);

	return [...cachedRecords, ...freshRecords];
}

export { getReturnItemImageUrls };
