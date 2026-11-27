export const returnsDayTableStyles = {
	wrapper: 'card overflow-x-auto',
	tableElement: 'w-full border-collapse text-sm',
	caption: 'sr-only',
	head: 'border-b border-line',
	headerCell: 'px-4 py-3 text-left text-sm font-normal text-dim',
	bodyRow:
		'border-t border-line transition-colors first:border-t-0 hover:bg-hover',
	bodyCell: 'px-4 py-3.5 text-off',
	timeCell: 'whitespace-nowrap tabular-nums',
	codeCell: 'whitespace-nowrap',
	detailsLink:
		'inline-block font-medium text-brand underline-offset-2 transition-transform hover:underline focus-visible:outline-2 focus-visible:outline-brand motion-safe:active:scale-[0.98]',
	correctionCell: 'whitespace-nowrap',
	correctionIssued: 'inline-flex text-success',
	correctionMissing: 'inline-flex text-faint',
	quantityCell: 'whitespace-nowrap tabular-nums',
	noteCell: 'w-full max-w-md truncate text-dim',
	importMark:
		'inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-off',
	empty: 'card p-6 text-dim',
} satisfies Record<string, string>;

export const returnsDayTableSkeletonStyles = {
	row: 'border-t border-line p-4 first:border-t-0',
} satisfies Record<string, string>;
