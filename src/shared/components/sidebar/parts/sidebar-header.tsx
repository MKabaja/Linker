import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { sidebarStyles } from '../sidebar.styles';

export function SidebarHeader({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-header"
			data-sidebar="header"
			className={cn(sidebarStyles.header, className)}
			{...props}
		/>
	);
}
