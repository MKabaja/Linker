import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { sidebarStyles } from '../sidebar.styles';

export function SidebarGroupContent({
	className,
	...props
}: ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-group-content"
			data-sidebar="group-content"
			className={cn(sidebarStyles.groupContent, className)}
			{...props}
		/>
	);
}
