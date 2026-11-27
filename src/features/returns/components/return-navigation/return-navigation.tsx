import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/shared/components/button';
import type { ReturnNeighbors } from '@/features/returns/model/returns.types';
import type { ReturnsListSearch } from '@/features/returns/utils/returns-list-query';
import { ReturnNavigationKeys } from './return-navigation.keys';
import { returnNavigationStyles } from './return-navigation.styles';

type ReturnNavigationProps = ReturnNeighbors & {
	/** Część adresu `?…` z zakresem listy, z której wszedł użytkownik; zachowują ją wszystkie linki. */
	listSearch: ReturnsListSearch;
};

export function ReturnNavigation({
	previousReturnId,
	nextReturnId,
	listSearch,
}: ReturnNavigationProps) {
	const buttonClassName = buttonVariants({ variant: 'outline' });
	return (
		<nav
			aria-label="Nawigacja między zwrotami"
			className={returnNavigationStyles.nav}
		>
			<ReturnNavigationKeys
				previousReturnId={previousReturnId}
				nextReturnId={nextReturnId}
				listSearch={listSearch}
			/>
			{previousReturnId === null ? (
				<button type="button" disabled className={buttonClassName}>
					<ChevronLeft aria-hidden="true" />
					Poprzedni
				</button>
			) : (
				<Link
					href={`/returns/${previousReturnId}${listSearch}`}
					className={buttonClassName}
				>
					<ChevronLeft aria-hidden="true" />
					Poprzedni
				</Link>
			)}
			<Link
				href={`/returns${listSearch}`}
				className={buttonVariants({ variant: 'ghost' })}
			>
				Wróć do listy
			</Link>
			{nextReturnId === null ? (
				<button type="button" disabled className={buttonClassName}>
					Następny
					<ChevronRight aria-hidden="true" />
				</button>
			) : (
				<Link
					href={`/returns/${nextReturnId}${listSearch}`}
					className={buttonClassName}
				>
					Następny
					<ChevronRight aria-hidden="true" />
				</Link>
			)}
		</nav>
	);
}
