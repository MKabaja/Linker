'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/features/auth/components/logout-button';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
} from '@/shared/components/sidebar';
import type { CurrentUser } from '@/features/auth/model/auth.types';
import { AppLogo } from './app-logo';
import {
	NAVIGATION_GROUPS,
	type NavigationLink,
	ROLE_LABEL_BY_ROLE,
	SETTINGS_LINK,
} from './app-sidebar.constants';
import { appSidebarStyles } from './app-sidebar.styles';

type SidebarUser = Pick<CurrentUser, 'name' | 'role'>;

type AppSidebarProps = { user: SidebarUser };

export function AppSidebar({ user }: AppSidebarProps) {
	const pathname = usePathname();
	const { state, isMobile, toggleSidebar, setOpenMobile } = useSidebar();
	const isCollapsed = state === 'collapsed' && !isMobile;
	const isLogoActive = isCollapsed || isMobile;
	const logoLabel = isMobile ? 'Zamknij menu' : 'Rozwiń menu';
	const closeMobileSidebar = () => setOpenMobile(false);
	const SettingsIcon = SETTINGS_LINK.icon;

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className={appSidebarStyles.header}>
				<button
					type="button"
					className={appSidebarStyles.logoButton}
					onClick={toggleSidebar}
					disabled={!isLogoActive}
					aria-label={isLogoActive ? logoLabel : undefined}
				>
					<AppLogo />
				</button>
				{!isMobile && <SidebarTrigger className={appSidebarStyles.trigger} />}
			</SidebarHeader>

			<SidebarContent className={appSidebarStyles.content}>
				{NAVIGATION_GROUPS.map(({ label: groupLabel, links }) => (
					<SidebarGroup key={groupLabel}>
						<SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{links.map((link) => (
									<SidebarMenuItem key={link.href}>
										<SidebarMenuButton
											render={
												<Link
													href={resolveNavigationHref(link, isMobile)}
													onClick={closeMobileSidebar}
												/>
											}
											isActive={pathname.startsWith(link.href)}
											tooltip={link.label}
										>
											<link.icon />
											<span className={appSidebarStyles.linkLabel}>
												{link.label}
											</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>

			<SidebarFooter className={appSidebarStyles.footer}>
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
						<LogoutButton />
					</SidebarMenuItem>
				</SidebarMenu>
				<SidebarSeparator className="mx-0" />
				<div className={appSidebarStyles.user}>
					<span className={appSidebarStyles.userAvatar} aria-hidden>
						{user.name.charAt(0).toUpperCase()}
					</span>
					<span className={appSidebarStyles.userText}>
						<span className={appSidebarStyles.userName}>{user.name}</span>
						<span className={appSidebarStyles.userRole}>
							{ROLE_LABEL_BY_ROLE[user.role]}
						</span>
					</span>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}

function resolveNavigationHref(
	{ href, mobileHref }: NavigationLink,
	isMobile: boolean,
): Route {
	return isMobile && mobileHref ? mobileHref : href;
}
