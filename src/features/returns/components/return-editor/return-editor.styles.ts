export const returnEditorStyles = {
	root: 'flex flex-col gap-4',
	summary: 'flex flex-wrap items-center justify-between gap-3',
	heading: 'text-[0.6875rem] font-semibold tracking-wider text-dim uppercase',
	list: 'flex flex-col border border-line bg-card',
	error: 'border border-danger p-3 text-sm text-danger',
} satisfies Record<string, string>;

export const returnItemRowStyles = {
	row: 'flex flex-col gap-3 border-t border-line p-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between',
	description: 'flex min-w-0 flex-col gap-1',
	name: 'font-medium text-main',
	codes: 'flex flex-wrap gap-x-4 font-mono text-xs text-dim',
	damaged: 'text-xs font-semibold tracking-wider text-warning uppercase',
	stepper: 'flex items-center gap-2 self-end sm:self-auto',
	stepButton: 'size-12 text-xl',
	counter: 'min-w-20 text-center text-xl font-semibold text-main tabular-nums',
	ordered: 'text-dim',
} satisfies Record<string, string>;

export const returnNoteFormStyles = {
	form: 'flex flex-col gap-2',
	label: 'text-[0.6875rem] font-semibold tracking-wider text-dim uppercase',
	textarea: 'min-h-24 w-full resize-y',
	footer: 'flex flex-wrap items-center gap-3',
	status: 'text-sm text-dim',
} satisfies Record<string, string>;

export const returnDeleteButtonStyles = {
	root: 'flex flex-wrap items-center gap-3 border-t border-line pt-4',
	question: 'text-sm text-off',
} satisfies Record<string, string>;
