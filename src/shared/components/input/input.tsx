'use client';

import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from 'cn';
import { inputStyles } from './input.styles';

type InputProps = InputPrimitive.Props;

function Input({ className, ...props }: InputProps) {
	return (
		<InputPrimitive
			data-slot="input"
			className={cn(inputStyles, className)}
			{...props}
		/>
	);
}

export { Input };
