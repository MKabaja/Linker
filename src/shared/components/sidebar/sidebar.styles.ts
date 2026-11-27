import { cva } from 'class-variance-authority';

export const sidebarStyles = {
	wrapper: 'group/sidebar-wrapper flex min-h-svh w-full md:h-full md:min-h-0',
	staticPanel:
		'flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground',
	mobilePanel:
		'w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden',
	mobileInner: 'flex h-full w-full flex-col',
	desktopRoot: 'group peer hidden text-sidebar-foreground md:block',
	gap: 'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0 group-data-[side=right]:rotate-180',
	gapIconDefault: 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
	gapIconFloating:
		'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]',
	container:
		'absolute inset-y-0 z-10 hidden h-full w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex',
	containerIconDefault:
		'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
	containerIconFloating:
		'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]',
	inner:
		'flex size-full flex-col group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border',
	inset:
		'relative flex min-w-0 flex-1 flex-col bg-card md:m-2 md:overflow-y-auto md:rounded-panel md:border md:border-line md:bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgb(123_140_246/0.06),transparent)]',
	header: 'flex flex-col gap-2 p-2',
	footer: 'flex flex-col gap-2 p-2',
	separator: 'mx-2 bg-line data-horizontal:w-auto',
	content:
		'no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
	group: 'relative flex w-full min-w-0 flex-col p-2',
	groupLabel:
		'mt-2 flex h-8 shrink-0 items-center px-2.5 text-sm text-dim ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
	groupContent: 'w-full text-sm',
	menu: 'flex w-full min-w-0 flex-col gap-1',
	menuItem: 'group/menu-item relative',
} satisfies Record<string, string>;

export const sidebarMenuButtonVariants = cva(
	'peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-control px-2.5 py-2 text-left text-sm text-off ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-2.5! hover:bg-hover hover:text-main focus-visible:ring-2 active:bg-active active:text-main disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-open:hover:bg-hover data-open:hover:text-main data-active:bg-active data-active:font-medium data-active:text-main [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-dim data-active:[&_svg]:text-main [&>span:last-child]:truncate',
	{
		variants: {
			variant: {
				default: 'hover:bg-hover hover:text-main',
				outline:
					'bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-hover hover:text-main',
			},
			size: {
				default: 'h-9 text-sm',
				sm: 'h-7 text-xs',
				lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);
