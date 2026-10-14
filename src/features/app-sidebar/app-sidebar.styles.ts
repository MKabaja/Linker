export const appSidebarStyles = {
	header:
		'flex-row items-center justify-between group-data-[collapsible=icon]:flex-col',
	logo: 'flex items-baseline rounded-md px-2 py-1 text-lg font-bold tracking-wide disabled:cursor-default enabled:cursor-pointer enabled:hover:bg-sidebar-accent',
	logoMark: 'text-brand',
	logoRest: 'group-data-[collapsible=icon]:hidden',
	trigger: 'group-data-[collapsible=icon]:hidden',
	content: 'pt-2',
	linkLabel: 'group-data-[collapsible=icon]:hidden',
} satisfies Record<string, string>;
