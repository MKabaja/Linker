import { cva } from 'class-variance-authority';

const glass =
	'rounded-control border border-white/20 bg-white/10 text-main backdrop-blur-md';

export const returnsScannerStyles = {
	root: 'fixed inset-0 z-40 overflow-hidden bg-black text-main select-none',
	video: 'absolute inset-0 size-full object-cover',
	topBar:
		'absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]',
	bottomBar:
		'absolute inset-x-0 bottom-0 flex flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
	actions: 'flex gap-2',
	zoomGroup: 'absolute top-1/2 right-3 flex -translate-y-1/2 flex-col gap-2',
	glassButton: `${glass} inline-flex min-h-12 min-w-12 items-center justify-center gap-2 px-4 text-sm font-medium transition-colors outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-brand active:bg-white/25 aria-pressed:border-brand aria-pressed:bg-brand/50 disabled:opacity-40`,
	glassButtonStacked: 'flex-1 flex-col gap-0.5 py-1.5 text-xs',
	glassButtonAccent:
		'border-accent bg-accent text-white hover:bg-accent-hover active:bg-accent-hover',
	glassPanel: `${glass} p-3`,
	statusPill: `${glass} inline-flex min-h-12 min-w-40 items-center justify-between gap-3 px-4 text-sm`,
	statusText: 'inline-flex items-center gap-2',
	visuallyHidden: 'sr-only',
	statusDot: 'size-2 rounded-full bg-success',
	centerNotice: `${glass} absolute inset-x-4 top-1/3 flex flex-col items-center gap-3 p-4 text-center`,
	traceList: 'flex flex-col gap-0.5 p-2 text-[11px] leading-tight',
	traceItem: 'flex items-center justify-between gap-2',
	traceText: 'truncate',
	startScreen:
		'absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black p-6 text-center',
	startTitle: 'text-lg font-semibold text-main',
	startHint: 'max-w-md text-sm text-off',
	startActions: 'flex flex-wrap items-center justify-center gap-2',
	overlay: 'pointer-events-none absolute inset-0',
	box: 'absolute border-2 transition-[left,top,width,height] duration-200',
	reticle:
		'absolute border-2 border-dashed transition-[left,top,width,height] duration-200',
	tapMarker:
		'absolute size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-brand/15 shadow-[0_0_0_2px_rgb(0_0_0/0.35)]',
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
		'flex w-full flex-col gap-1 rounded-card border border-line-strong bg-field p-3 text-left outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-brand',
	candidateHeader: 'flex items-baseline justify-between gap-3',
	candidateId: 'text-lg font-bold',
	candidateBits: 'text-sm text-dim',
	candidateReasons: 'text-sm text-off',
	existingReturn:
		'rounded-md border-2 border-danger bg-danger/15 px-2 py-1 text-sm font-bold text-danger',
	candidateNumberRow:
		'flex flex-wrap items-center gap-2 font-mono text-sm text-off',
	candidateNumberTail: 'font-semibold text-main',
	candidateMeta: 'text-sm text-off',
	candidateProducts: 'flex flex-col text-sm text-dim',
	sheetNote: 'px-4 pb-4 text-sm text-off',
	sheetRetry:
		'mx-4 mb-4 inline-flex min-h-12 items-center justify-center rounded-control border border-line-strong bg-field px-4 text-sm font-medium text-off outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-brand',
	secondaryAction:
		'inline-flex min-h-12 items-center justify-center rounded-control border border-line-strong bg-field px-4 text-sm font-medium text-off outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-brand',
	form: 'flex flex-col gap-3 px-4 pb-4',
	input: 'h-12 flex-1 bg-field text-base',
	inputRow: 'flex items-center gap-2',
	modeToggle:
		'inline-flex h-12 min-w-14 items-center justify-center rounded-control border border-line-strong bg-field px-3 text-sm font-medium text-off outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-brand aria-pressed:border-brand aria-pressed:text-main',
	note: 'text-sm text-off',
	submit:
		'inline-flex min-h-12 items-center justify-center rounded-control bg-accent px-4 text-sm font-medium text-white outline-none hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50',
} satisfies Record<string, string>;

export const carrierBadgeVariants = cva(
	'rounded-md px-1.5 py-0.5 text-xs font-bold whitespace-nowrap',
	{
		variants: {
			carrier: {
				inpost: 'bg-[#ffcd00] text-black',
				'inpost-zwrot': 'bg-[#ffcd00] text-black',
				dpd: 'bg-[#dc0032] text-white',
				dhl: 'bg-[#ffcc00] text-[#d40511]',
				'poczta-polska': 'bg-[#e30613] text-white',
				'dhl-lub-gls': 'bg-white/20 text-main',
				gls: 'bg-[#061ab1] text-[#ffd100]',
				orlen: 'bg-[#e4002b] text-white',
				'allegro-one': 'bg-[#ff5a00] text-black',
			},
		},
	},
);
