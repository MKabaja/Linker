import { cva } from 'class-variance-authority';

export const statTileVariants = cva('relative flex flex-col gap-1', {
	variants: {
		variant: {
			bar: 'p-6',
			card: 'card card-hover gap-0.5 px-4 py-2.5',
		},
		isActive: {
			true: 'border-brand/60 bg-brand/10',
			false: '',
		},
	},
	defaultVariants: { variant: 'bar', isActive: false },
});

export const statTileStyles = {
	labelText: 'section-label',
	link: 'after:absolute after:inset-0 after:rounded-card hover:text-main focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand',
	valueByVariant: {
		bar: 'text-3xl font-semibold text-main tabular-nums',
		card: 'text-xl font-semibold text-main tabular-nums',
	},
	hintText: 'text-sm text-dim',
} satisfies Record<string, string | Record<string, string>>;
