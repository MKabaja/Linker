import { ImageOff } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { getProductThumbnailUrl } from '@/features/products/utils/get-product-thumbnail-url';
import { productThumbnailStyles } from './product-thumbnail.styles';

type ProductThumbnailProps = {
	ean: string;
};

const THUMBNAIL_SIZE_PX = 44;

export function ProductThumbnail({ ean }: ProductThumbnailProps) {
	const { photoTile, emptyTile, photo, emptyIcon } = productThumbnailStyles;
	const [hasFailed, setHasFailed] = useState(false);

	if (hasFailed) {
		return (
			<span className={emptyTile}>
				<ImageOff className={emptyIcon} aria-hidden />
			</span>
		);
	}

	return (
		<span className={photoTile}>
			<Image
				src={getProductThumbnailUrl(ean)}
				alt=""
				width={THUMBNAIL_SIZE_PX}
				height={THUMBNAIL_SIZE_PX}
				className={photo}
				unoptimized
				onError={() => setHasFailed(true)}
			/>
		</span>
	);
}
