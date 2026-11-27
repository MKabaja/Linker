import { Suspense, use } from 'react';
import { ProductThumbnail } from '@/features/products/components/product-thumbnail';
import { Skeleton } from '@/shared/components/skeleton';
import type { ImageUrlByItemId } from '@/features/returns/model/product-images.types';
import type { ReturnItem } from '@/features/returns/model/returns.types';

type ReturnItemThumbnailProps = {
	item: ReturnItem;
	imageUrlByItemIdPromise: Promise<ImageUrlByItemId>;
};

export function ReturnItemThumbnail({
	item,
	imageUrlByItemIdPromise,
}: ReturnItemThumbnailProps) {
	return (
		<Suspense fallback={<Skeleton className="size-12 rounded-control" />}>
			<ResolvedThumbnail
				item={item}
				imageUrlByItemIdPromise={imageUrlByItemIdPromise}
			/>
		</Suspense>
	);
}

function ResolvedThumbnail({
	item,
	imageUrlByItemIdPromise,
}: ReturnItemThumbnailProps) {
	const imageUrlByItemId = use(imageUrlByItemIdPromise);

	return (
		<ProductThumbnail
			ean={item.ean}
			name={item.name}
			imageUrl={imageUrlByItemId[item.id]}
		/>
	);
}
