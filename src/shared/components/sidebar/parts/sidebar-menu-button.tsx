'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import type { ComponentProps } from 'react';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/shared/components/tooltip';
import { sidebarMenuButtonVariants } from '../sidebar.styles';
import { useSidebar } from '../use-sidebar';

type SidebarMenuButtonProps = useRender.ComponentProps<'button'> &
	ComponentProps<'button'> &
	VariantProps<typeof sidebarMenuButtonVariants> & {
		isActive?: boolean;
		tooltip?: string | ComponentProps<typeof TooltipContent>;
	};

export function SidebarMenuButton({
	render,
	isActive = false,
	variant = 'default',
	size = 'default',
	tooltip,
	className,
	...props
}: SidebarMenuButtonProps) {
	const { isMobile, state } = useSidebar();
	const button = useRender({
		defaultTagName: 'button',
		props: mergeProps<'button'>(
			{
				className: cn(sidebarMenuButtonVariants({ variant, size }), className),
			},
			props,
		),
		render: tooltip ? <TooltipTrigger render={render} /> : render,
		state: {
			slot: 'sidebar-menu-button',
			sidebar: 'menu-button',
			size,
			active: isActive,
		},
	});

	if (!tooltip) {
		return button;
	}

	const tooltipProps =
		typeof tooltip === 'string' ? { children: tooltip } : tooltip;

	return (
		<Tooltip>
			{button}
			<TooltipContent
				side="right"
				align="center"
				hidden={state !== 'collapsed' || isMobile}
				{...tooltipProps}
			/>
		</Tooltip>
	);
}
