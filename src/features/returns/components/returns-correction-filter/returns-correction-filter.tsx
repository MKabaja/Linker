import Link from 'next/link';
import {
	correctionFilterLabelByFilter,
	RETURNS_CORRECTION_FILTERS,
} from '@/features/returns/model/returns-list.constants';
import type { ReturnsListScope } from '@/features/returns/model/returns-list.types';
import { toReturnsListSearch } from '@/features/returns/utils/returns-list-query';
import {
	returnsCorrectionFilterOptionVariants,
	returnsCorrectionFilterStyles,
} from './returns-correction-filter.styles';

type ReturnsCorrectionFilterNavProps = { scope: ReturnsListScope };

export function ReturnsCorrectionFilterNav({
	scope,
}: ReturnsCorrectionFilterNavProps) {
	return (
		<nav
			aria-label="Filtr korekty"
			className={returnsCorrectionFilterStyles.root}
		>
			{RETURNS_CORRECTION_FILTERS.map((correction) => {
				const isActive = scope.correction === correction;

				return (
					<Link
						key={correction}
						href={`/returns${toReturnsListSearch({ ...scope, correction })}`}
						aria-current={isActive ? 'page' : undefined}
						className={returnsCorrectionFilterOptionVariants({ isActive })}
					>
						{correctionFilterLabelByFilter[correction]}
					</Link>
				);
			})}
		</nav>
	);
}
