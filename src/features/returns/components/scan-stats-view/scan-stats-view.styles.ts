export const scanStatsViewStyles = {
	root: 'flex flex-col gap-6',
	tiles:
		'card grid grid-cols-2 divide-line overflow-hidden lg:grid-cols-4 lg:divide-x',
	tables: 'grid gap-6 lg:grid-cols-2',
	tableWrapper: 'card overflow-x-auto',
	tableElement: 'w-full border-collapse text-sm',
	caption:
		'border-b border-line px-4 py-3 text-left text-sm font-normal text-dim',
	headerCell: 'px-4 py-2 text-left text-sm font-normal text-dim',
	bodyRow: 'border-t border-line',
	bodyCell: 'px-4 py-3.5 text-off',
	numberCell: 'text-right tabular-nums',
	empty: 'px-4 py-3 text-dim',
} satisfies Record<string, string>;
