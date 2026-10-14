import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { sidebarStyles } from '../sidebar.styles';

export function SidebarInset({ className, ...props }: ComponentProps<'main'>) {
	return (
		<main
			data-slot="sidebar-inset"
			className={cn(sidebarStyles.inset, className)}
			{...props}
		/>
	);
}
