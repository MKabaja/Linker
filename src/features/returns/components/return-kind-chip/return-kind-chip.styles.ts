import { cva } from 'class-variance-authority';

export const returnKindChipVariants = cva(
	'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
	{
		variants: {
			kind: {
				full: 'bg-success/15 text-success',
				partial: 'bg-warning/15 text-warning',
			},
		},
	},
);

export const returnKindDotVariants = cva('size-1.5 rounded-full', {
	variants: {
		kind: {
			full: 'bg-success',
			partial: 'bg-warning',
		},
	},
});
