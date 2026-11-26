export const returnsDayTableStyles = {
	wrapper: 'card overflow-x-auto',
	tableElement: 'w-full border-collapse text-sm',
	caption: 'sr-only',
	head: 'border-b border-line',
	headerCell:
		'px-4 py-3 text-left text-[0.6875rem] font-semibold tracking-wider text-dim uppercase',
	bodyRow:
		'relative border-t border-line transition-colors first:border-t-0 hover:bg-hover',
	bodyCell: 'px-4 py-2.5 text-off',
	timeCell: 'whitespace-nowrap tabular-nums',
	orderLink:
		'font-mono font-semibold text-main after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-brand',
	quantityCell: 'whitespace-nowrap tabular-nums',
	noteCell: 'w-full max-w-md truncate text-dim',
	importMark:
		'inline-flex border border-line px-2 py-0.5 text-xs text-dim uppercase',
	empty: 'card p-6 text-dim',
} satisfies Record<string, string>;

export const returnsDayTableSkeletonStyles = {
	row: 'border-t border-line p-4 first:border-t-0',
} satisfies Record<string, string>;
