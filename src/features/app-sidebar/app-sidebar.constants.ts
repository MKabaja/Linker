import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Package, ShoppingCart } from 'lucide-react';
import type { Route } from 'next';

type NavigationLink = {
	href: Route;
	label: string;
	icon: LucideIcon;
};

export const NAVIGATION_LINKS: NavigationLink[] = [
	{ href: '/orders', label: 'Zamówienia', icon: ClipboardList },
	{ href: '/products', label: 'Produkty', icon: Package },
	{ href: '/shopping-list', label: 'Lista zakupów', icon: ShoppingCart },
];
