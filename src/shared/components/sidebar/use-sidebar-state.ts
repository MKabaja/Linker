import { useCallback, useEffect, useState } from 'react';
import { useIsMobile } from '@/shared/hooks/use-is-mobile';
import {
	SIDEBAR_COOKIE_MAX_AGE,
	SIDEBAR_COOKIE_NAME,
	SIDEBAR_KEYBOARD_SHORTCUT,
} from './sidebar.constants';
import type { SidebarContextProps } from './sidebar.types';

type UseSidebarStateOptions = {
	defaultOpen: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
};

export function useSidebarState({
	defaultOpen,
	open: controlledOpen,
	onOpenChange,
}: UseSidebarStateOptions): SidebarContextProps {
	const isMobile = useIsMobile();
	const [openMobile, setOpenMobile] = useState(false);
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = controlledOpen ?? uncontrolledOpen;

	const setOpen = useCallback(
		(nextOpen: boolean) => {
			if (onOpenChange) {
				onOpenChange(nextOpen);
			} else {
				setUncontrolledOpen(nextOpen);
			}

			document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
		},
		[onOpenChange],
	);

	const toggleSidebar = useCallback(() => {
		if (isMobile) {
			setOpenMobile((current) => !current);
		} else {
			setOpen(!open);
		}
	}, [isMobile, open, setOpen]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isShortcut =
				event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
				(event.metaKey || event.ctrlKey);

			if (isShortcut) {
				event.preventDefault();
				toggleSidebar();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [toggleSidebar]);

	return {
		state: open ? 'expanded' : 'collapsed',
		open,
		setOpen,
		isMobile,
		openMobile,
		setOpenMobile,
		toggleSidebar,
	};
}
