import { PRODUCT_THUMBNAILS_URL } from '@/features/products/model/products.constants';

export function getProductThumbnailUrl(ean: string): string {
	return `${PRODUCT_THUMBNAILS_URL}/${encodeURIComponent(ean)}.jpg`;
}
