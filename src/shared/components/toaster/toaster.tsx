'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { toasterThemeVariables } from './toaster.styles';

export function Toaster() {
	return (
		<SonnerToaster
			theme="dark"
			position="bottom-right"
			duration={2000}
			style={toasterThemeVariables}
		/>
	);
}
