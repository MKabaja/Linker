import 'server-only';
import { inArray, sql } from 'drizzle-orm';
import { db } from '@/database/client';
import { productImages } from '@/database/schema/product-images.schema';
import type { ProductImageRecord } from '@/features/returns/model/product-images.types';

async function findProductImages(
	productIds: number[],
): Promise<ProductImageRecord[]> {
	if (productIds.length === 0) {
		return [];
	}

	return db
		.select()
		.from(productImages)
		.where(inArray(productImages.productId, productIds));
}

/**
 * Zapisuje zdjęcia w cache (upsert po `productId`).
 */
async function saveProductImages(records: ProductImageRecord[]): Promise<void> {
	if (records.length === 0) {
		return;
	}

	await db
		.insert(productImages)
		.values(records)
		.onConflictDoUpdate({
			target: productImages.productId,
			set: {
				ean: excluded('ean'),
				imageUrl: excluded('image_url'),
				syncedAt: excluded('synced_at'),
			},
		});
}

function excluded(columnName: string) {
	return sql.raw(`excluded.${columnName}`);
}

export { findProductImages, saveProductImages };
