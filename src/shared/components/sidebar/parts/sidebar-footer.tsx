import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { sidebarStyles } from '../sidebar.styles';

export function SidebarFooter({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-footer"
			data-sidebar="footer"
			className={cn(sidebarStyles.footer, className)}
			{...props}
		/>
	);
}
