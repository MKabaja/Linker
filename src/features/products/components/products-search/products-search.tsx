'use client';

import { useId } from 'react';
import { PRODUCTS_SEARCH_MAX_LENGTH } from '@/features/products/model/products.constants';
import { Input } from '@/shared/components/input';
import { productsSearchStyles } from './products-search.styles';
import { useProductsSearch } from './use-products-search';

export function ProductsSearch() {
	const inputId = useId();
	const { searchText, changeSearchText, isPending } = useProductsSearch();

	return (
		<search
			data-pending={isPending || undefined}
			className={productsSearchStyles.search}
		>
			<label htmlFor={inputId} className={productsSearchStyles.label}>
				Szukaj produktów
			</label>
			<Input
				id={inputId}
				type="search"
				value={searchText}
				onValueChange={changeSearchText}
				placeholder="EAN lub nazwa produktu"
				maxLength={PRODUCTS_SEARCH_MAX_LENGTH}
				autoComplete="off"
			/>
		</search>
	);
}
