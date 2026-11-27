export const returnPackagesStyles = {
	section: 'flex flex-col gap-3',
	heading: 'section-label',
	list: 'flex flex-col gap-3',
	package: 'card card-hover flex flex-col gap-1 p-4',
	courier: 'text-sm font-medium text-brand',
	number: 'font-mono text-base font-semibold whitespace-nowrap text-main',
	inner: 'text-sm text-dim',
	empty: 'card p-4 text-sm text-dim',
	error: 'rounded-card border border-danger/40 p-4 text-sm text-danger',
} satisfies Record<string, string>;
