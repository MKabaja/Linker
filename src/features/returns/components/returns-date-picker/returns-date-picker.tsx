'use client';

import Form from 'next/form';
import { Input } from '@/shared/components/input';
import type { ReturnsListScope } from '@/features/returns/model/returns-list.types';
import { toReturnsListSearchParams } from '@/features/returns/utils/returns-list-query';
import { returnsDatePickerStyles } from './returns-date-picker.styles';

type ReturnsDatePickerProps = { scope: ReturnsListScope & { date: string } };

export function ReturnsDatePicker({ scope }: ReturnsDatePickerProps) {
	const { form, label } = returnsDatePickerStyles;
	const { date } = scope;
	const keptParams = toReturnsListSearchParams({ ...scope, date: undefined });

	return (
		<Form action="/returns" className={form}>
			{[...keptParams].map(([name, value]) => (
				<input key={name} type="hidden" name={name} value={value} />
			))}
			<label htmlFor="returns-date" className={label}>
				Dzień
			</label>
			<Input
				id="returns-date"
				type="date"
				name="date"
				required
				defaultValue={date}
				key={date}
				onChange={(event) => event.currentTarget.form?.requestSubmit()}
			/>
		</Form>
	);
}
