import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { getProductImageSources } from '@/features/products/utils/get-product-image-sources';
import { FadeInImage } from './product-thumbnail.image';
import { productThumbnailStyles } from './product-thumbnail.styles';

type ProductThumbnailProps = {
	ean: string;
	name: string;
	/** Adres zdjęcia z BaseLinkera; bez niego albo przy błędzie działa miniatura pvex po EAN. */
	imageUrl?: string;
};

const THUMBNAIL_SIZE_PX = 48;
const PREVIEW_SIZE_PX = 360;
const PREVIEW_SIZES = '(min-width: 768px) 256px, min(80vw, 360px)';
const HOVER_DELAY_MILLISECONDS = 150;
const HOVER_CLOSE_DELAY_MILLISECONDS = 100;
const PREVIEW_OFFSET_PX = 6;
const VIEWPORT_PADDING_PX = 8;

export function ProductThumbnail({
	ean,
	name,
	imageUrl,
}: ProductThumbnailProps) {
	const {
		photoTile,
		emptyTile,
		photo,
		emptyIcon,
		positioner,
		preview,
		previewFrame,
		previewPhoto,
	} = productThumbnailStyles;
	const sources = getProductImageSources({ imageUrl, ean });
	const [failedCount, setFailedCount] = useState(0);
	const source = sources[failedCount];

	if (!source) {
		return (
			<span className={emptyTile}>
				<ImageOff className={emptyIcon} aria-hidden />
			</span>
		);
	}

	return (
		<PopoverPrimitive.Root>
			<PopoverPrimitive.Trigger
				openOnHover
				delay={HOVER_DELAY_MILLISECONDS}
				closeDelay={HOVER_CLOSE_DELAY_MILLISECONDS}
				className={photoTile}
				aria-label={`Powiększ zdjęcie: ${name}`}
			>
				<FadeInImage
					key={source.src}
					src={source.src}
					width={THUMBNAIL_SIZE_PX}
					height={THUMBNAIL_SIZE_PX}
					sizes={`${THUMBNAIL_SIZE_PX}px`}
					className={photo}
					loading="lazy"
					decoding="async"
					unoptimized={!source.isOptimizable}
					onError={() => setFailedCount(failedCount + 1)}
				/>
			</PopoverPrimitive.Trigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Positioner
					side="bottom"
					sideOffset={PREVIEW_OFFSET_PX}
					collisionPadding={VIEWPORT_PADDING_PX}
					className={positioner}
				>
					<PopoverPrimitive.Popup className={preview} aria-label={name}>
						<span className={previewFrame}>
							<FadeInImage
								src={source.src}
								alt={name}
								width={PREVIEW_SIZE_PX}
								height={PREVIEW_SIZE_PX}
								sizes={PREVIEW_SIZES}
								className={previewPhoto}
								loading="lazy"
								decoding="async"
								unoptimized={!source.isOptimizable}
							/>
						</span>
					</PopoverPrimitive.Popup>
				</PopoverPrimitive.Positioner>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}
