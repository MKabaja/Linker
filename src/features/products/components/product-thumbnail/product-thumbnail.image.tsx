import { cn } from 'cn';
import Image from 'next/image';
import { type ComponentProps, useState } from 'react';
import { productThumbnailStyles } from './product-thumbnail.styles';

type FadeInImageProps = Omit<ComponentProps<typeof Image>, 'alt' | 'onLoad'> & {
	alt?: string;
};

export function FadeInImage({
	alt = '',
	className,
	...props
}: FadeInImageProps) {
	const { fadeIn, fadeInLoaded } = productThumbnailStyles;
	const [isLoaded, setIsLoaded] = useState(false);

	return (
		<Image
			{...props}
			alt={alt}
			ref={(image) => {
				if (image?.complete && image.naturalWidth > 0) {
					setIsLoaded(true);
				}
			}}
			className={cn(fadeIn, isLoaded && fadeInLoaded, className)}
			onLoad={() => setIsLoaded(true)}
		/>
	);
}
