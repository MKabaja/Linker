export const checkboxStyles = {
	root: 'relative inline-grid size-5 shrink-0 place-items-center',
	input:
		'peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-md border border-line-strong bg-field transition-colors outline-none checked:border-brand checked:bg-brand hover:border-brand focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50',
	indicator: 'pointer-events-none relative text-on-brand',
	icon: 'size-3.5',
} satisfies Record<string, string>;
