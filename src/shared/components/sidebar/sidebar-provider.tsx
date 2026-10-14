'use client';

import { cn } from 'cn';
import type { ComponentProps, CSSProperties } from 'react';
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from './sidebar.constants';
import { sidebarStyles } from './sidebar.styles';
import { SidebarContext } from './sidebar-context';
import { useSidebarState } from './use-sidebar-state';

type SidebarProviderProps = ComponentProps<'div'> & {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
};

export function SidebarProvider({
	defaultOpen = true,
	open,
	onOpenChange,
	className,
	style,
	children,
	...props
}: SidebarProviderProps) {
	const sidebarState = useSidebarState({ defaultOpen, open, onOpenChange });

	return (
		<SidebarContext.Provider value={sidebarState}>
			<div
				data-slot="sidebar-wrapper"
				style={
					{
						'--sidebar-width': SIDEBAR_WIDTH,
						'--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
						...style,
					} as CSSProperties
				}
				className={cn(sidebarStyles.wrapper, className)}
				{...props}
			>
				{children}
			</div>
		</SidebarContext.Provider>
	);
}
