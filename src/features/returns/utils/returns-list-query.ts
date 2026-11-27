import { defaultReturnsListFilters } from '@/features/returns/model/returns-list.constants';
import type { ReturnsListScope } from '@/features/returns/model/returns-list.types';

/**
 * Zamienia zakres listy na parametry adresu; wartości domyślne (sortowanie, filtr) i brak dnia są pomijane.
 */
function toReturnsListSearchParams(scope: ReturnsListScope): URLSearchParams {
	const params = new URLSearchParams();

	if (scope.date) {
		params.set('date', scope.date);
	}

	if (scope.sort !== defaultReturnsListFilters.sort) {
		params.set('sort', scope.sort);
	}

	if (scope.correction !== defaultReturnsListFilters.correction) {
		params.set('correction', scope.correction);
	}

	return params;
}

type ReturnsListSearch = '' | `?${string}`;

/**
 * Zwraca część adresu `?…` dla zakresu listy albo pusty tekst, gdy nie ma żadnych parametrów.
 */
function toReturnsListSearch(scope: ReturnsListScope): ReturnsListSearch {
	const query = toReturnsListSearchParams(scope).toString();

	return query ? `?${query}` : '';
}

export {
	type ReturnsListSearch,
	toReturnsListSearch,
	toReturnsListSearchParams,
};
