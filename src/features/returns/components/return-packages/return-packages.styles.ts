export const returnPackagesStyles = {
	section: 'flex flex-col gap-3',
	heading: 'text-[0.6875rem] font-semibold tracking-wider text-dim uppercase',
	list: 'grid gap-3 sm:grid-cols-2',
	package: 'flex flex-col gap-1 border border-line bg-card p-4',
	courier: 'text-xs font-semibold tracking-wider text-brand uppercase',
	number: 'font-mono text-xl font-semibold text-main break-all',
	inner: 'text-sm text-dim',
	empty: 'border border-line bg-card p-4 text-sm text-dim',
	error: 'border border-danger p-4 text-sm text-danger',
} satisfies Record<string, string>;
