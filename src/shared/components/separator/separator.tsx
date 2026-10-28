'use client';

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from 'cn';
import { separatorStyles } from './separator.styles';

type SeparatorProps = SeparatorPrimitive.Props;

function Separator({
	className,
	orientation = 'horizontal',
	...props
}: SeparatorProps) {
	return (
		<SeparatorPrimitive
			data-slot="separator"
			orientation={orientation}
			className={cn(separatorStyles, className)}
			{...props}
		/>
	);
}

export { Separator };
