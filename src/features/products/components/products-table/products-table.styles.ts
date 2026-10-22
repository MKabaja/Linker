type ClassNameByColumnId = Record<string, string>;

export const productsTableStyles = {
	wrapper: 'card overflow-x-auto',
	table: 'w-full border-collapse text-sm',
	caption: 'sr-only',
	head: 'bg-surface',
	headerCell:
		'px-4 py-3 text-left text-xs font-medium tracking-wide text-dim uppercase',
	row: 'border-t border-line transition-colors hover:bg-hover',
	cell: 'px-4 py-2.5 text-off',
} satisfies Record<string, string>;

export const productsTableColumnStyles: ClassNameByColumnId = {
	ean: 'font-mono whitespace-nowrap',
	name: 'w-full text-main',
	price: 'text-right whitespace-nowrap tabular-nums',
	quantity: 'text-right tabular-nums',
	vat: 'text-right tabular-nums',
};
