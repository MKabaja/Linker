import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { inputStyles } from './input.styles';

function Input({ className, type, ...props }: ComponentProps<'input'>) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(inputStyles, className)}
			{...props}
		/>
	);
}

export { Input };
