export type SidebarState = 'expanded' | 'collapsed';

export type SidebarContextProps = {
	state: SidebarState;
	open: boolean;
	setOpen: (open: boolean) => void;
	openMobile: boolean;
	setOpenMobile: (open: boolean) => void;
	isMobile: boolean;
	toggleSidebar: () => void;
};
