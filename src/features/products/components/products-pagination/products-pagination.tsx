import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/shared/components/button';
import { cn } from '@/shared/lib/utils';
import { productsPaginationStyles } from './products-pagination.styles';

type ProductsPaginationProps = {
	query: string;
	page: number;
	pageCount: number;
	totalCount: number;
};

type PageLinkProps = {
	query: string;
	targetPage: number | null;
	children: ReactNode;
};

type ProductNounByPluralRule = Record<Intl.LDMLPluralRule, string>;

const productNounByPluralRule: ProductNounByPluralRule = {
	zero: 'produktów',
	one: 'produkt',
	two: 'produkty',
	few: 'produkty',
	many: 'produktów',
	other: 'produktu',
};

const pluralRules = new Intl.PluralRules('pl-PL');

export function ProductsPagination({
	query,
	page,
	pageCount,
	totalCount,
}: ProductsPaginationProps) {
	const previousPage = page > 1 ? page - 1 : null;
	const nextPage = page < pageCount ? page + 1 : null;

	return (
		<nav
			aria-label="Stronicowanie produktów"
			className={productsPaginationStyles.nav}
		>
			<p className={productsPaginationStyles.summary}>
				Strona {page} z {pageCount} · {formatProductCount(totalCount)}
			</p>
			<div className={productsPaginationStyles.links}>
				<PageLink query={query} targetPage={previousPage}>
					Poprzednia
				</PageLink>
				<PageLink query={query} targetPage={nextPage}>
					Następna
				</PageLink>
			</div>
		</nav>
	);
}

function PageLink({ query, targetPage, children }: PageLinkProps) {
	const className = cn(
		buttonVariants({ variant: 'outline', size: 'sm' }),
		productsPaginationStyles.link,
	);

	if (targetPage === null) {
		return (
			<span aria-disabled="true" className={className}>
				{children}
			</span>
		);
	}

	return (
		<Link
			href={{ pathname: '/products', query: buildPageQuery(query, targetPage) }}
			className={className}
		>
			{children}
		</Link>
	);
}

function buildPageQuery(query: string, page: number) {
	return query === '' ? { page } : { q: query, page };
}

function formatProductCount(count: number): string {
	const noun = productNounByPluralRule[pluralRules.select(count)];
	return `${count.toLocaleString('pl-PL')} ${noun}`;
}
