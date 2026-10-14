import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { Separator } from '@/shared/components/separator';
import { sidebarStyles } from '../sidebar.styles';

export function SidebarSeparator({
	className,
	...props
}: ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="sidebar-separator"
			data-sidebar="separator"
			className={cn(sidebarStyles.separator, className)}
			{...props}
		/>
	);
}
