'use client';

import { cn } from 'cn';
import type { ComponentProps, CSSProperties } from 'react';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/shared/components/sheet';
import { SIDEBAR_WIDTH_MOBILE } from './sidebar.constants';
import { sidebarStyles } from './sidebar.styles';
import { useSidebar } from './use-sidebar';

type SidebarProps = ComponentProps<'div'> & {
	side?: 'left' | 'right';
	variant?: 'sidebar' | 'floating' | 'inset';
	collapsible?: 'offcanvas' | 'icon' | 'none';
};

export function Sidebar({
	side = 'left',
	variant = 'sidebar',
	collapsible = 'offcanvas',
	className,
	children,
	dir,
	...props
}: SidebarProps) {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
	const isFloatingOrInset = variant === 'floating' || variant === 'inset';

	if (collapsible === 'none') {
		return (
			<div
				data-slot="sidebar"
				className={cn(sidebarStyles.staticPanel, className)}
				{...props}
			>
				{children}
			</div>
		);
	}

	if (isMobile) {
		return (
			<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
				<SheetContent
					dir={dir}
					data-sidebar="sidebar"
					data-slot="sidebar"
					data-mobile="true"
					className={sidebarStyles.mobilePanel}
					style={{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE } as CSSProperties}
					side={side}
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Sidebar</SheetTitle>
						<SheetDescription>Displays the mobile sidebar.</SheetDescription>
					</SheetHeader>
					<div className={sidebarStyles.mobileInner}>{children}</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<div
			className={sidebarStyles.desktopRoot}
			data-state={state}
			data-collapsible={state === 'collapsed' ? collapsible : ''}
			data-variant={variant}
			data-side={side}
			data-slot="sidebar"
		>
			<div
				data-slot="sidebar-gap"
				className={cn(
					sidebarStyles.gap,
					isFloatingOrInset
						? sidebarStyles.gapIconFloating
						: sidebarStyles.gapIconDefault,
				)}
			/>
			<div
				data-slot="sidebar-container"
				data-side={side}
				className={cn(
					sidebarStyles.container,
					isFloatingOrInset
						? sidebarStyles.containerIconFloating
						: sidebarStyles.containerIconDefault,
					className,
				)}
				{...props}
			>
				<div
					data-sidebar="sidebar"
					data-slot="sidebar-inner"
					className={sidebarStyles.inner}
				>
					{children}
				</div>
			</div>
		</div>
	);
}
