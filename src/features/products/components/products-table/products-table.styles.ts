type ClassNameByColumnId = Record<string, string>;

export const productsTableStyles = {
	wrapper: 'card overflow-x-auto',
	tableElement: 'w-full border-collapse text-sm',
	caption: 'sr-only',
	head: 'bg-surface',
	headerCell:
		'px-4 py-3 text-left text-xs font-medium tracking-wide text-dim uppercase',
	loadedBody: 'motion-safe:animate-in motion-safe:fade-in-60',
	bodyRow: 'border-t border-line transition-colors hover:bg-hover',
	bodyCell: 'px-4 py-2.5 text-off',
} satisfies Record<string, string>;

export const productsTableColumnStyles: ClassNameByColumnId = {
	ean: 'font-mono whitespace-nowrap',
	name: 'w-full text-main',
	price: 'text-right whitespace-nowrap tabular-nums',
	quantity: 'text-right tabular-nums',
	vat: 'text-right tabular-nums',
};

export const productsTableSkeletonStyles: ClassNameByColumnId = {
	ean: 'my-1 h-4 w-28',
	name: 'my-1 h-4 w-full max-w-md',
	price: 'my-1 ml-auto h-4 w-16',
	quantity: 'my-1 ml-auto h-4 w-8',
	vat: 'my-1 ml-auto h-4 w-8',
};
