'use client';

import { cn } from 'cn';
import { PanelLeftIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Button } from '@/shared/components/button';
import { useSidebar } from '../use-sidebar';

export function SidebarTrigger({
	className,
	onClick,
	...props
}: ComponentProps<typeof Button>) {
	const { toggleSidebar } = useSidebar();

	return (
		<Button
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			variant="ghost"
			size="icon-sm"
			className={cn(className)}
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
			{...props}
		>
			<PanelLeftIcon />
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	);
}
