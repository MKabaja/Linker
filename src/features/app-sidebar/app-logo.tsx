import { appSidebarStyles } from './app-sidebar.styles';

export function AppLogo() {
	const { logo, logoMark, logoLabel } = appSidebarStyles;

	return (
		<span className={logo}>
			<span className={logoMark}>L</span>
			<span className={logoLabel}>Linker</span>
		</span>
	);
}
