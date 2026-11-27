import type { CSSProperties } from 'react';

type CssVariables = CSSProperties & Record<`--${string}`, string>;

export const toasterThemeVariables: CssVariables = {
	'--normal-bg': 'var(--color-active)',
	'--normal-border': 'var(--color-line-strong)',
	'--normal-text': 'var(--color-main)',
	'--success-bg': 'var(--color-active)',
	'--success-border': 'var(--color-line-strong)',
	'--success-text': 'var(--color-success)',
	'--error-bg': 'var(--color-active)',
	'--error-border': 'var(--color-line-strong)',
	'--error-text': 'var(--color-danger)',
	'--border-radius': 'var(--radius-control)',
};
