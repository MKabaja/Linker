export const returnHistoryStyles = {
	section: 'flex flex-col gap-3',
	heading: 'text-[0.6875rem] font-semibold tracking-wider text-dim uppercase',
	list: 'flex flex-col border border-line bg-card',
	event:
		'flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line px-4 py-3 text-sm first:border-t-0',
	kind: 'font-medium text-main',
	meta: 'text-dim',
} satisfies Record<string, string>;
