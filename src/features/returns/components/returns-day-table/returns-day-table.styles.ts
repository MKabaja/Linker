import { cva } from 'class-variance-authority';

export const returnsDayTableStyles = {
	wrapper: 'card overflow-x-auto',
	tableElement: 'w-full border-collapse text-sm',
	caption: 'sr-only',
	head: 'border-b border-line',
	headerCell: 'px-4 py-3 text-left text-sm font-normal text-dim',
	bodyRow:
		'group relative cursor-pointer border-t border-line first:border-t-0 hover:bg-hover motion-safe:transition-colors motion-safe:duration-150',
	bodyCell: 'px-4 py-3.5 text-off',
	timeCell: 'whitespace-nowrap tabular-nums',
	rowLink:
		'font-medium text-main outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand',
	interactive: 'relative z-10 inline-flex',
	codeCell: 'whitespace-nowrap',
	correctionCell: 'whitespace-nowrap',
	quantityCell: 'whitespace-nowrap tabular-nums',
	noteCell: 'w-full max-w-xs truncate text-dim',
	importMark:
		'inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-off',
	empty: 'card p-6 text-dim',
} satisfies Record<string, string>;

export const correctionPillVariants = cva(
	'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
	{
		variants: {
			state: {
				issued: 'bg-success/15 text-success',
				missing: 'bg-warning/10 text-warning/80',
			},
		},
	},
);

export const returnsDayTableSkeletonStyles = {
	row: 'border-t border-line p-4 first:border-t-0',
} satisfies Record<string, string>;
