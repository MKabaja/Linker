export const returnPageStyles = {
	columns: 'flex flex-col gap-6 lg:grid lg:grid-cols-[3fr_2fr] lg:items-start',
	column: 'contents lg:flex lg:flex-col lg:gap-6',
	editable: 'm-0 min-w-0 border-0 p-0',
	items: 'order-1',
	note: 'order-2',
	match: 'order-3 lg:order-2',
	correction: 'order-4 lg:order-1',
	packages: 'order-5',
	customer: 'order-6',
	shipping: 'order-7',
	history: 'order-8',
	delete: 'order-9',
} satisfies Record<string, string>;
