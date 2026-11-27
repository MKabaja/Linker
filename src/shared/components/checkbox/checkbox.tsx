'use client';

import { cn } from 'cn';
import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ComponentProps } from 'react';
import { checkboxStyles } from './checkbox.styles';

type CheckboxProps = Omit<ComponentProps<'input'>, 'type' | 'checked'> & {
	checked: boolean;
};

/**
 * Natywny checkbox z animowanym znacznikiem. Jest zawsze kontrolowany, więc `checked` i `onChange` są po stronie wywołującego.
 */
export function Checkbox({ checked, className, ...props }: CheckboxProps) {
	const { root, input, indicator, icon } = checkboxStyles;

	return (
		<span className={root}>
			<input
				type="checkbox"
				checked={checked}
				className={cn(input, className)}
				{...props}
			/>
			<AnimatePresence initial={false}>
				{checked && (
					<motion.span
						key="check"
						aria-hidden="true"
						className={indicator}
						initial={{ opacity: 0, scale: 0.6 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.6 }}
						transition={{ duration: 0.12 }}
					>
						<Check className={icon} strokeWidth={3} />
					</motion.span>
				)}
			</AnimatePresence>
		</span>
	);
}
