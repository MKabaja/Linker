'use client';

import { CircleUser } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
} from '@/shared/components/sidebar';
import {
	GUEST_LABEL,
	NAVIGATION_LINKS,
	SETTINGS_LINK,
} from './app-sidebar.constants';
import { appSidebarStyles } from './app-sidebar.styles';

export function AppSidebar() {
	const pathname = usePathname();
	const { state, isMobile, toggleSidebar, setOpenMobile } = useSidebar();
	const isCollapsed = state === 'collapsed' && !isMobile;
	const closeMobileSidebar = () => setOpenMobile(false);
	const SettingsIcon = SETTINGS_LINK.icon;

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className={appSidebarStyles.header}>
				<button
					type="button"
					className={appSidebarStyles.logo}
					onClick={toggleSidebar}
					disabled={!isCollapsed}
					aria-label={isCollapsed ? 'Rozwiń menu' : undefined}
				>
					<span className={appSidebarStyles.logoMark}>L</span>
					<span className={appSidebarStyles.logoRest}>INKER</span>
				</button>
				<SidebarTrigger className={appSidebarStyles.trigger} />
			</SidebarHeader>

			<SidebarSeparator />

			<SidebarContent className={appSidebarStyles.content}>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{NAVIGATION_LINKS.map(({ href, label, icon: Icon }) => (
								<SidebarMenuItem key={href}>
									<SidebarMenuButton
										render={<Link href={href} onClick={closeMobileSidebar} />}
										isActive={pathname.startsWith(href)}
										tooltip={label}
									>
										<Icon />
										<span className={appSidebarStyles.linkLabel}>{label}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarSeparator />

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							render={
								<Link href={SETTINGS_LINK.href} onClick={closeMobileSidebar} />
							}
							isActive={pathname.startsWith(SETTINGS_LINK.href)}
							tooltip={SETTINGS_LINK.label}
						>
							<SettingsIcon />
							<span className={appSidebarStyles.linkLabel}>
								{SETTINGS_LINK.label}
							</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton render={<div />} tooltip={GUEST_LABEL}>
							<CircleUser />
							<span className={appSidebarStyles.linkLabel}>{GUEST_LABEL}</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
