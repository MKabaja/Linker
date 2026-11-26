import { cva } from 'class-variance-authority';

export const returnKindChipStyles = {
	chip: 'inline-flex items-center gap-2 border border-line px-2 py-0.5 text-xs font-medium whitespace-nowrap text-off',
} satisfies Record<string, string>;

export const returnKindDotVariants = cva('size-2 rounded-full', {
	variants: {
		kind: {
			full: 'bg-success',
			partial: 'bg-warning',
		},
	},
});
