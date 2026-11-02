import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { skeletonStyles } from './skeleton.styles';

type SkeletonProps = ComponentProps<'div'>;

function Skeleton({ className, ...props }: SkeletonProps) {
	return (
		<div
			data-slot="skeleton"
			className={cn(skeletonStyles, className)}
			{...props}
		/>
	);
}

export { Skeleton };
