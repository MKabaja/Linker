import {
	OPTIMIZED_IMAGE_HOSTNAME,
	PRODUCT_THUMBNAILS_URL,
} from '@/features/products/model/products.constants';

type ProductImageVariant = 'small' | 'medium' | 'large';

type ProductImageSource = {
	src: string;
	/** `true` tylko dla hosta dopuszczonego w `images.remotePatterns`. */
	isOptimizable: boolean;
};

type ProductImageSourcesQuery = { imageUrl: string | undefined; ean: string };

const PRESTASHOP_IMAGE_PATTERN =
	/^(https:\/\/[^/]+\/img\/p\/(?:\d+\/)+\d+)\.jpg$/;

/**
 * Buduje URL wariantu zdjęcia PrestaShop (`…/31539.jpg` → `…/31539-small_default.jpg`).
 * Inne adresy zwraca bez zmian.
 */
function getProductImageVariantUrl(
	imageUrl: string,
	variant: ProductImageVariant,
): string {
	const match = PRESTASHOP_IMAGE_PATTERN.exec(imageUrl);

	return match ? `${match[1]}-${variant}_default.jpg` : imageUrl;
}

/**
 * Zwraca źródła zdjęcia w kolejności prób: wariant `large` zdjęcia z BaseLinkera, jego oryginał, miniatura pvex po EAN.
 */
function getProductImageSources({
	imageUrl,
	ean,
}: ProductImageSourcesQuery): ProductImageSource[] {
	const baseLinkerUrls = imageUrl
		? [...new Set([getProductImageVariantUrl(imageUrl, 'large'), imageUrl])]
		: [];
	const pvexUrls = ean
		? [`${PRODUCT_THUMBNAILS_URL}/${encodeURIComponent(ean)}.jpg`]
		: [];

	return [
		...baseLinkerUrls.map((src) => ({
			src,
			isOptimizable: isOptimizable(src),
		})),
		...pvexUrls.map((src) => ({ src, isOptimizable: false })),
	];
}

function isOptimizable(src: string): boolean {
	if (!URL.canParse(src)) {
		return false;
	}

	const { hostname, pathname } = new URL(src);

	return (
		hostname === OPTIMIZED_IMAGE_HOSTNAME && pathname.startsWith('/img/p/')
	);
}

export {
	getProductImageSources,
	getProductImageVariantUrl,
	type ProductImageSource,
	type ProductImageVariant,
};
