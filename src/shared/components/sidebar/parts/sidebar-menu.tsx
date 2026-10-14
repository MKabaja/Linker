import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { sidebarStyles } from '../sidebar.styles';

export function SidebarMenu({ className, ...props }: ComponentProps<'ul'>) {
	return (
		<ul
			data-slot="sidebar-menu"
			data-sidebar="menu"
			className={cn(sidebarStyles.menu, className)}
			{...props}
		/>
	);
}
