import { SidebarInset, SidebarProvider } from '@/shared/components/sidebar';
import { AppMobileHeader } from '@/features/app-sidebar/app-mobile-header';
import { AppSidebar } from '@/features/app-sidebar/app-sidebar';

export default function AppLayout({ children }: LayoutProps<'/'>) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="px-4 pt-0 pb-4 md:p-8">
				<AppMobileHeader />
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
