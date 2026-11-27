import type {
	ReturnsCorrectionFilter,
	ReturnsListFilters,
	ReturnsSort,
} from '@/features/returns/model/returns-list.types';

type SortLabelBySort = Record<ReturnsSort, string>;

type CorrectionFilterLabelByFilter = Record<ReturnsCorrectionFilter, string>;

const RETURNS_SORTS = [
	'scanned-desc',
	'scanned-asc',
	'order-asc',
	'order-desc',
] as const satisfies readonly ReturnsSort[];

const RETURNS_CORRECTION_FILTERS = [
	'all',
	'without',
	'with',
] as const satisfies readonly ReturnsCorrectionFilter[];

const defaultReturnsListFilters: ReturnsListFilters = {
	sort: 'scanned-desc',
	correction: 'all',
};

const sortLabelBySort: SortLabelBySort = {
	'scanned-desc': 'Skanowanie: najnowsze',
	'scanned-asc': 'Skanowanie: najstarsze',
	'order-asc': 'Zamówienie: rosnąco',
	'order-desc': 'Zamówienie: malejąco',
};

const correctionFilterLabelByFilter: CorrectionFilterLabelByFilter = {
	all: 'Wszystkie',
	without: 'Bez korekty',
	with: 'Z korektą',
};

export {
	correctionFilterLabelByFilter,
	defaultReturnsListFilters,
	RETURNS_CORRECTION_FILTERS,
	RETURNS_SORTS,
	sortLabelBySort,
};
