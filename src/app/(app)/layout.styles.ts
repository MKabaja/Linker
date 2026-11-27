export const appLayoutStyles = {
	page: 'min-h-svh bg-app md:p-3',
	frame: 'md:h-[calc(100svh-1.5rem)] md:rounded-frame md:border md:border-line',
	shell:
		'md:overflow-hidden md:rounded-[inherit] md:bg-surface md:bg-[radial-gradient(ellipse_40%_50%_at_0%_100%,rgb(123_140_246/0.08),transparent)]',
} satisfies Record<string, string>;
