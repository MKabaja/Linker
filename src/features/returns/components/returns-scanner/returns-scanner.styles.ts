const glass = 'border border-white/20 bg-white/10 text-main backdrop-blur-md';

export const returnsScannerStyles = {
	root: 'fixed inset-0 z-40 overflow-hidden bg-black text-main select-none',
	video: 'absolute inset-0 size-full object-cover',
	topBar:
		'absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]',
	bottomBar:
		'absolute inset-x-0 bottom-0 flex flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
	actions: 'grid grid-cols-3 gap-2',
	zoomGroup: 'absolute top-1/2 right-3 flex -translate-y-1/2 flex-col gap-2',
	glassButton: `${glass} inline-flex min-h-12 min-w-12 items-center justify-center gap-2 px-4 text-sm font-medium transition-colors outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-brand active:bg-white/25 aria-pressed:border-brand aria-pressed:bg-brand/50 disabled:opacity-40`,
	glassButtonStacked: 'flex-col gap-0.5 py-1.5 text-xs',
	glassButtonBrand:
		'border-brand bg-brand/70 text-on-brand hover:bg-brand/80 active:bg-brand-active',
	glassPanel: `${glass} p-3`,
	statusPill: `${glass} inline-flex min-h-12 items-center gap-2 px-4 text-sm`,
	statusDot: 'size-2 bg-success',
	centerNotice: `${glass} absolute inset-x-4 top-1/3 flex flex-col items-center gap-3 p-4 text-center`,
	traceList: 'flex flex-col gap-1 text-sm',
	traceItem: 'flex items-center justify-between gap-3',
	traceText: 'truncate',
	hint: 'text-sm text-off',
	overlay: 'pointer-events-none absolute inset-0',
	box: 'absolute border-2 transition-[left,top,width,height] duration-200',
	reticle:
		'absolute border-2 border-dashed transition-[left,top,width,height] duration-200',
} satisfies Record<string, string>;

export const boxStyleByTraceState = {
	reading: 'border-white/70',
	'checked-none': 'border-dim',
	candidates: 'border-warning',
	hit: 'border-success',
} satisfies Record<string, string>;

export const scannerSheetStyles = {
	content:
		'max-h-[85dvh] overflow-y-auto border-white/20 bg-card/90 text-main backdrop-blur-md',
	list: 'flex flex-col gap-2 px-4 pb-4',
	candidate:
		'flex w-full flex-col gap-1 border border-line-strong bg-field p-3 text-left outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-brand',
	candidateHeader: 'flex items-baseline justify-between gap-3',
	candidateId: 'text-lg font-bold',
	candidateBits: 'text-sm text-dim',
	candidateReasons: 'text-sm text-off',
	existingReturn:
		'border-2 border-danger bg-danger/15 px-2 py-1 text-sm font-bold text-danger',
	form: 'flex flex-col gap-3 px-4 pb-4',
	input: 'h-12 bg-field text-base',
	note: 'text-sm text-off',
	submit:
		'inline-flex min-h-12 items-center justify-center bg-brand px-4 text-sm font-medium text-on-brand outline-none hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50',
} satisfies Record<string, string>;
