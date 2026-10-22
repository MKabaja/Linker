export { productsSearchParamsSchema } from '@/features/products/model/products.schemas';
export type { PrimaveraProductsResult } from '@/features/products/model/products.types';
export { ProductsPagination } from './components/products-pagination';
export { ProductsTable } from './components/products-table';
export { getPrimaveraProducts } from './server/repositories/products.repository';
export {
	getPrimaveraProductsPage,
	searchPrimaveraProducts,
} from './server/services/products.service';
