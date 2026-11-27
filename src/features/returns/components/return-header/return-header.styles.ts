export const returnHeaderStyles = {
	header: 'flex flex-col gap-2',
	title: 'text-lg font-semibold tracking-tight',
	meta: 'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-off',
	metaItem:
		'flex items-center gap-3 not-last:after:text-faint not-last:after:content-["·"]',
} satisfies Record<string, string>;
