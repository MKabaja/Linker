export const productThumbnailStyles = {
	photoTile:
		'flex size-12 cursor-zoom-in items-center justify-center overflow-hidden rounded-control bg-white p-0.5 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:scale-100',
	emptyTile:
		'flex size-12 items-center justify-center rounded-control border border-line text-dim',
	photo: 'size-full object-contain',
	emptyIcon: 'size-4',
	positioner: 'z-50',
	preview:
		'origin-(--transform-origin) rounded-card border border-line-strong bg-card p-2 shadow-lg transition-[opacity,scale] duration-150 data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-ending-style:scale-[0.96] data-ending-style:opacity-0 motion-reduce:transition-none',
	previewFrame:
		'flex aspect-square w-[min(80vw,22.5rem)] items-center justify-center overflow-hidden rounded-control bg-white md:w-64',
	previewPhoto: 'size-full object-contain',
	fadeIn:
		'opacity-0 transition-opacity duration-200 motion-reduce:transition-none',
	fadeInLoaded: 'opacity-100',
} satisfies Record<string, string>;
