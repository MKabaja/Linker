import type { ProductImageRecord } from '@/features/returns/model/product-images.types';

const PRODUCT_IMAGE_TTL_MILLISECONDS = 30 * 24 * 60 * 60_000;

type StaleProductIdsQuery = {
	productIds: number[];
	records: ProductImageRecord[];
	now: Date;
};

/**
 * Zwraca identyfikatory produktów, których nie ma w cache albo wpis jest starszy niż 30 dni.
 */
function selectStaleProductIds({
	productIds,
	records,
	now,
}: StaleProductIdsQuery): number[] {
	const syncedAtByProductId = new Map(
		records.map(({ productId, syncedAt }) => [productId, syncedAt.getTime()]),
	);

	return productIds.filter((productId) => {
		const syncedAt = syncedAtByProductId.get(productId);

		return (
			syncedAt === undefined ||
			now.getTime() - syncedAt > PRODUCT_IMAGE_TTL_MILLISECONDS
		);
	});
}

export { selectStaleProductIds };
