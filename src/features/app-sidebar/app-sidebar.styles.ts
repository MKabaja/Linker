export const appSidebarStyles = {
	header:
		'flex-row items-center justify-between px-3 pt-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-2',
	logoButton:
		'flex items-center rounded-control p-1 disabled:cursor-default enabled:cursor-pointer enabled:hover:bg-hover',
	logo: 'flex items-center gap-2 text-sm font-semibold text-main',
	logoMark:
		'flex size-6 items-center justify-center rounded-md bg-active text-xs font-semibold text-main',
	logoLabel: 'group-data-[collapsible=icon]:hidden',
	mobileHeader:
		'sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-card p-2 md:hidden',
	menuButton: 'size-11',
	trigger: 'group-data-[collapsible=icon]:hidden',
	content: 'pt-1',
	linkLabel: 'group-data-[collapsible=icon]:hidden',
	footer: 'px-2 pb-2',
	user: 'flex items-center gap-2.5 px-1 pt-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
	userAvatar:
		'flex size-8 shrink-0 items-center justify-center rounded-md bg-active text-xs font-medium text-main',
	userText: 'flex min-w-0 flex-col group-data-[collapsible=icon]:hidden',
	userName: 'truncate text-sm text-main',
	userRole: 'text-xs text-dim',
} satisfies Record<string, string>;
