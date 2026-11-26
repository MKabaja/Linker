'use client';

import Form from 'next/form';
import { Input } from '@/shared/components/input';
import { returnsDatePickerStyles } from './returns-date-picker.styles';

type ReturnsDatePickerProps = { date: string };

export function ReturnsDatePicker({ date }: ReturnsDatePickerProps) {
	const { form, label } = returnsDatePickerStyles;

	return (
		<Form action="/returns" className={form}>
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
