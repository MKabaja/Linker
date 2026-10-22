import type {
	PrimaveraProduct,
	PrimaveraProductsPage,
} from '../products.types';

type PageRequest = {
	page: number;
	pageSize: number;
};

export function paginateProducts(
	products: PrimaveraProduct[],
	{ page, pageSize }: PageRequest,
): PrimaveraProductsPage {
	const totalCount = products.length;
	const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
	const currentPage = Math.min(page, pageCount);
	const firstIndex = (currentPage - 1) * pageSize;

	return {
		products: products.slice(firstIndex, firstIndex + pageSize),
		totalCount,
		page: currentPage,
		pageCount,
	};
}
