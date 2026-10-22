type PageRequest = {
	page: number;
	pageSize: number;
};

export type Page<T> = {
	items: T[];
	totalCount: number;
	page: number;
	pageCount: number;
};

/**
 * Zwraca jedną stronę listy razem z łączną liczbą elementów i liczbą stron.
 * Numer strony większy niż liczba stron jest przycinany do ostatniej strony.
 * Pusta lista daje jedną pustą stronę.
 */
export function paginate<T>(
	items: T[],
	{ page, pageSize }: PageRequest,
): Page<T> {
	const totalCount = items.length;
	const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
	const currentPage = Math.min(page, pageCount);
	const firstIndex = (currentPage - 1) * pageSize;

	return {
		items: items.slice(firstIndex, firstIndex + pageSize),
		totalCount,
		page: currentPage,
		pageCount,
	};
}
