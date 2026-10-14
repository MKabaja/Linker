'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { sidebarStyles } from '../sidebar.styles';

export function SidebarGroupLabel({
	className,
	render,
	...props
}: useRender.ComponentProps<'div'> & ComponentProps<'div'>) {
	return useRender({
		defaultTagName: 'div',
		props: mergeProps<'div'>(
			{ className: cn(sidebarStyles.groupLabel, className) },
			props,
		),
		render,
		state: {
			slot: 'sidebar-group-label',
			sidebar: 'group-label',
		},
	});
}
