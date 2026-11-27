'use client';

import { useRouter } from 'next/navigation';
import {
	RETURNS_SORTS,
	sortLabelBySort,
} from '@/features/returns/model/returns-list.constants';
import type { ReturnsListScope } from '@/features/returns/model/returns-list.types';
import { returnsSortSchema } from '@/features/returns/model/returns-page.schemas';
import { toReturnsListSearch } from '@/features/returns/utils/returns-list-query';
import { returnsSortSelectStyles } from './returns-sort-select.styles';

type ReturnsSortSelectProps = { scope: ReturnsListScope };

export function ReturnsSortSelect({ scope }: ReturnsSortSelectProps) {
	const router = useRouter();
	const { root, label, select } = returnsSortSelectStyles;

	function changeSort(value: string) {
		const parsedSort = returnsSortSchema.safeParse(value);

		if (parsedSort.success) {
			router.push(
				`/returns${toReturnsListSearch({ ...scope, sort: parsedSort.data })}`,
			);
		}
	}

	return (
		<div className={root}>
			<label htmlFor="returns-sort" className={label}>
				Sortuj
			</label>
			<select
				id="returns-sort"
				value={scope.sort}
				onChange={(event) => changeSort(event.currentTarget.value)}
				className={select}
			>
				{RETURNS_SORTS.map((sort) => (
					<option key={sort} value={sort}>
						{sortLabelBySort[sort]}
					</option>
				))}
			</select>
		</div>
	);
}
