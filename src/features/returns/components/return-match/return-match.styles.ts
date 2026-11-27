import { cva } from 'class-variance-authority';

export const returnMatchStyles = {
	section: 'flex flex-col gap-2 lg:gap-3',
	heading: 'section-label',
	card: 'card flex flex-col gap-2 border-brand/30 bg-brand/5 p-3 hover:border-brand/50 hover:bg-brand/10 motion-safe:transition-colors motion-safe:duration-150 lg:gap-3 lg:p-4',
	method: 'text-sm font-semibold text-main lg:text-base',
	label: 'font-mono text-base font-semibold break-all text-main lg:text-xl',
	missing: 'text-sm text-dim',
	badges: 'flex flex-wrap gap-2',
} satisfies Record<string, string>;

export const returnMatchBadgeVariants = cva(
	'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
	{
		variants: {
			tone: {
				neutral: 'bg-white/5 text-off',
				info: 'bg-brand/15 text-brand',
				success: 'bg-success/15 text-success',
				accent: 'bg-brand-orange/15 text-brand-orange',
			},
		},
	},
);
