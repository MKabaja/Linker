import { cva } from 'class-variance-authority';

export const returnsCorrectionFilterStyles = {
	root: 'inline-flex items-center rounded-control border border-line-strong bg-field p-0.5',
} satisfies Record<string, string>;

export const returnsCorrectionFilterOptionVariants = cva(
	'inline-flex h-8 items-center rounded-md px-3 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-brand/20 motion-safe:active:scale-[0.98]',
	{
		variants: {
			isActive: {
				true: 'bg-active text-main',
				false: 'text-dim hover:text-main',
			},
		},
	},
);
