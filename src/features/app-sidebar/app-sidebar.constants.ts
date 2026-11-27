import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Package, PackageOpen, Settings } from 'lucide-react';
import type { Route } from 'next';
import type { UserRole } from '@/features/auth/model/auth.schemas';

export type NavigationLink = {
	href: Route;
	mobileHref?: Route;
	label: string;
	icon: LucideIcon;
};

type NavigationGroup = {
	label: string;
	links: NavigationLink[];
};

export const NAVIGATION_GROUPS: NavigationGroup[] = [
	{
		label: 'Sprzedaż',
		links: [
			{ href: '/orders', label: 'Zamówienia', icon: ClipboardList },
			{
				href: '/returns',
				mobileHref: '/returns/scan',
				label: 'Zwroty',
				icon: PackageOpen,
			},
		],
	},
	{
		label: 'Magazyn',
		links: [
			{ href: '/products', label: 'Produkty z Primavery', icon: Package },
		],
	},
];

export const SETTINGS_LINK: NavigationLink = {
	href: '/settings',
	label: 'Ustawienia',
	icon: Settings,
};

export const ROLE_LABEL_BY_ROLE: Record<UserRole, string> = {
	admin: 'Administrator',
	employee: 'Pracownik',
};
