import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Package, Settings, ShoppingCart } from 'lucide-react';
import type { Route } from 'next';

type NavigationLink = {
	href: Route;
	label: string;
	icon: LucideIcon;
};

export const NAVIGATION_LINKS: NavigationLink[] = [
	{ href: '/orders', label: 'Zamówienia', icon: ClipboardList },
	{ href: '/products', label: 'Produkty z Primavery', icon: Package },
	{ href: '/shopping-list', label: 'Lista zakupów', icon: ShoppingCart },
];

export const SETTINGS_LINK: NavigationLink = {
	href: '/settings',
	label: 'Ustawienia',
	icon: Settings,
};

export const GUEST_LABEL = 'Gość';
