import type { CSSProperties } from 'react';

type CssVariables = CSSProperties & Record<`--${string}`, string>;

export const toasterThemeVariables: CssVariables = {
	'--normal-bg': 'var(--color-card)',
	'--normal-border': 'var(--color-line)',
	'--normal-text': 'var(--color-main)',
	'--success-bg': 'var(--color-card)',
	'--success-border': 'var(--color-line)',
	'--success-text': 'var(--color-success)',
	'--error-bg': 'var(--color-card)',
	'--error-border': 'var(--color-line)',
	'--error-text': 'var(--color-danger)',
	'--border-radius': 'var(--radius-control)',
};
