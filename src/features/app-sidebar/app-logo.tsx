import type { ComponentProps } from 'react';
import { appSidebarStyles } from './app-sidebar.styles';

export function AppLogo(props: ComponentProps<'button'>) {
	return (
		<button type="button" className={appSidebarStyles.logo} {...props}>
			<span className={appSidebarStyles.logoMark}>L</span>
			<span className={appSidebarStyles.logoRest}>INKER</span>
		</button>
	);
}
