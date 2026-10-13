import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { skeletonStyles } from './skeleton.styles';

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="skeleton"
			className={cn(skeletonStyles, className)}
			{...props}
		/>
	);
}

export { Skeleton };
