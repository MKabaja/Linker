'use client';

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from 'cn';
import { separatorStyles } from './separator.styles';

function Separator({
	className,
	orientation = 'horizontal',
	...props
}: SeparatorPrimitive.Props) {
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
