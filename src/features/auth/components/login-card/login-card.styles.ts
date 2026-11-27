const loginCardStyles = {
	frame: 'w-full max-w-4xl rounded-card border border-line md:rounded-frame',
	card: 'grid overflow-hidden rounded-[inherit] bg-card md:grid-cols-[1.1fr_1fr]',
	intro:
		'flex flex-col gap-8 bg-surface bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgb(123_140_246/0.1),transparent)] p-6 md:p-10',
	logo: 'flex items-center gap-2 text-base font-semibold text-main',
	logoMark:
		'flex size-6 items-center justify-center rounded-md bg-active text-xs font-semibold',
	formPanel:
		'flex flex-col justify-center gap-6 border-t border-line bg-[radial-gradient(ellipse_80%_50%_at_100%_100%,rgb(240_138_93/0.07),transparent)] p-6 md:border-t-0 md:border-l md:p-10',
	formTitle: 'text-2xl font-semibold tracking-tight text-main',
} satisfies Record<string, string>;

const loginIllustrationStyles = {
	svg: 'mx-auto hidden w-full max-w-xs md:block',
	gradientStart: '[stop-color:var(--color-brand)]',
	gradientEnd: '[stop-color:var(--color-brand-orange)]',
	orbit: 'fill-none [stroke-width:1]',
	spoke: 'stroke-line-strong [stroke-dasharray:2_6]',
	nodeBrand: 'fill-brand',
	nodeAccent: 'fill-brand-orange',
	tile: 'fill-active stroke-line-strong',
	tileLetter: 'fill-main text-xl font-semibold',
} satisfies Record<string, string>;

export { loginCardStyles, loginIllustrationStyles };
