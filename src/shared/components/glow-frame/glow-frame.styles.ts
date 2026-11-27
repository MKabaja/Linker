const cursorGlow =
	'bg-[radial-gradient(300px_circle_at_var(--glow-x,-999px)_var(--glow-y,-999px),rgb(150_170_255),transparent_70%),radial-gradient(320px_circle_at_0_0,rgb(150_170_255/0.8),transparent_70%)]';

export const glowFrameStyles = {
	root: 'relative isolate',
	edge: `pointer-events-none absolute -inset-0.5 hidden rounded-[inherit] border-2 border-transparent ${cursorGlow} [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)] md:block pointer-coarse:hidden`,
	halo: `pointer-events-none absolute -inset-2 -z-10 hidden rounded-[inherit] ${cursorGlow} opacity-80 blur-md md:block pointer-coarse:hidden`,
} satisfies Record<string, string>;
