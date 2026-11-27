'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { useSidebar } from '@/shared/components/sidebar';
import { AppLogo } from './app-logo';
import { appSidebarStyles } from './app-sidebar.styles';

export function AppMobileHeader() {
	const { openMobile, toggleSidebar } = useSidebar();

	return (
		<header className={appSidebarStyles.mobileHeader}>
			<Button
				variant="ghost"
				size="icon-lg"
				className={appSidebarStyles.menuButton}
				onClick={toggleSidebar}
				aria-label="Otwórz menu"
				aria-expanded={openMobile}
			>
				<Menu aria-hidden />
			</Button>
			<AppLogo />
		</header>
	);
}
