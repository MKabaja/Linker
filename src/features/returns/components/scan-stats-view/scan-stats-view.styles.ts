export const scanStatsViewStyles = {
	root: 'flex flex-col gap-6',
	tiles: 'grid grid-cols-2 gap-3 lg:grid-cols-4',
	tables: 'grid gap-6 lg:grid-cols-2',
	tableWrapper: 'card overflow-x-auto',
	tableElement: 'w-full border-collapse text-sm',
	caption:
		'border-b border-line px-4 py-3 text-left text-[0.6875rem] font-semibold tracking-wider text-dim uppercase',
	headerCell:
		'px-4 py-2 text-left text-[0.6875rem] font-semibold tracking-wider text-dim uppercase',
	bodyRow: 'border-t border-line',
	bodyCell: 'px-4 py-2.5 text-off',
	numberCell: 'text-right tabular-nums',
	empty: 'px-4 py-3 text-dim',
} satisfies Record<string, string>;
