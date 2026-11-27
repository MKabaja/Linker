export const returnEditorStyles = {
	root: 'flex flex-col gap-4',
	summary: 'flex flex-wrap items-center justify-between gap-3',
	heading: 'section-label',
	list: 'card card-hover flex flex-col overflow-hidden',
	error: 'rounded-card border border-danger/40 p-3 text-sm text-danger',
} satisfies Record<string, string>;

export const returnItemRowStyles = {
	row: 'flex flex-col gap-3 border-t border-line p-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between',
	product: 'flex min-w-0 items-start gap-3',
	thumbnail: 'shrink-0',
	description: 'flex min-w-0 flex-col gap-1',
	name: 'font-medium text-main',
	codes: 'flex flex-wrap gap-x-4 font-mono text-xs text-dim',
	damaged: 'text-xs font-medium text-warning',
	stepper: 'flex items-center gap-2 self-end sm:self-auto',
	stepButton: 'size-12 text-xl',
	counter: 'min-w-20 text-center text-xl font-semibold text-main tabular-nums',
	surplusCounter:
		'min-w-20 text-center text-xl font-semibold text-warning tabular-nums',
	ordered: 'text-dim',
} satisfies Record<string, string>;

export const returnNoteFormStyles = {
	form: 'card card-hover flex flex-col gap-2 p-4',
	label: 'section-label',
	textarea: 'min-h-24 w-full resize-y',
	footer: 'flex flex-wrap items-center gap-3',
	status: 'text-sm text-dim',
} satisfies Record<string, string>;

export const returnDeleteButtonStyles = {
	root: 'flex flex-col gap-3 rounded-card border border-danger/30 bg-danger/5 p-4',
	heading: 'text-sm font-medium text-danger',
	actions: 'flex flex-wrap items-center gap-3',
	question: 'text-sm text-off',
	error: 'text-sm text-danger',
} satisfies Record<string, string>;
