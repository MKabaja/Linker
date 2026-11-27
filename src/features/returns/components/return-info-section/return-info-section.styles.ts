export const returnInfoSectionStyles = {
	section: 'flex flex-col gap-3',
	heading: 'section-label',
	card: 'card p-4',
	fields: 'grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2',
	label: 'section-label',
	value: 'mt-1 break-words text-off',
	notice: 'text-sm text-dim',
	error: 'text-sm text-danger',
} satisfies Record<string, string>;
