type ReturnsSort = 'scanned-desc' | 'scanned-asc' | 'order-asc' | 'order-desc';

type ReturnsCorrectionFilter = 'all' | 'without' | 'with';

/** Sortowanie i filtr listy zwrotów; to je szczegół zwrotu dostaje w adresie, by sąsiedzi szli w kolejności listy. */
type ReturnsListFilters = {
	sort: ReturnsSort;
	correction: ReturnsCorrectionFilter;
};

/** Zakres listy zwrotów; bez `date` obejmuje wszystkie dni. */
type ReturnsListScope = ReturnsListFilters & { date?: string };

export type {
	ReturnsCorrectionFilter,
	ReturnsListFilters,
	ReturnsListScope,
	ReturnsSort,
};
