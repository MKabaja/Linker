import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/shared/components/button';
import type { ReturnNeighbors } from '@/features/returns/model/returns.types';
import { ReturnNavigationKeys } from './return-navigation.keys';
import { returnNavigationStyles } from './return-navigation.styles';

type ReturnNavigationProps = ReturnNeighbors;

export function ReturnNavigation({
	previousReturnId,
	nextReturnId,
}: ReturnNavigationProps) {
	const { nav, hint } = returnNavigationStyles;
	const buttonClassName = buttonVariants({ variant: 'outline' });

	return (
		<nav aria-label="Nawigacja między zwrotami" className={nav}>
			<ReturnNavigationKeys
				previousReturnId={previousReturnId}
				nextReturnId={nextReturnId}
			/>
			{previousReturnId === null ? (
				<button type="button" disabled className={buttonClassName}>
					<ChevronLeft aria-hidden="true" />
					Poprzedni
				</button>
			) : (
				<Link href={`/returns/${previousReturnId}`} className={buttonClassName}>
					<ChevronLeft aria-hidden="true" />
					Poprzedni
				</Link>
			)}
			<span className={hint} aria-hidden="true">
				← →
			</span>
			{nextReturnId === null ? (
				<button type="button" disabled className={buttonClassName}>
					Następny
					<ChevronRight aria-hidden="true" />
				</button>
			) : (
				<Link href={`/returns/${nextReturnId}`} className={buttonClassName}>
					Następny
					<ChevronRight aria-hidden="true" />
				</Link>
			)}
		</nav>
	);
}
