'use client';

import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { copyValueButtonStyles } from './copy-value-button.styles';

type CopyValueButtonProps = {
	label: string;
	value: string;
	children: ReactNode;
};

export function CopyValueButton({
	label,
	value,
	children,
}: CopyValueButtonProps) {
	async function copyValue() {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(`Skopiowano ${label}`, { description: value });
		} catch {
			toast.error(`Nie udało się skopiować: ${label}`);
		}
	}

	return (
		<button
			type="button"
			aria-label={`Kopiuj ${label} ${value}`}
			className={copyValueButtonStyles.button}
			onClick={copyValue}
		>
			{children}
		</button>
	);
}
