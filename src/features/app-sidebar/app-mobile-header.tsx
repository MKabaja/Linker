'use client';

import { useSidebar } from '@/shared/components/sidebar';
import { AppLogo } from './app-logo';
import { appSidebarStyles } from './app-sidebar.styles';

export function AppMobileHeader() {
	const { toggleSidebar } = useSidebar();

	return (
		<header className={appSidebarStyles.mobileHeader}>
			<AppLogo onClick={toggleSidebar} aria-label="Otwórz menu" />
		</header>
	);
}
