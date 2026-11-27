import { GlowFrame } from '@/shared/components/glow-frame';
import { MotionProvider } from '@/shared/components/motion-provider';
import { SidebarInset, SidebarProvider } from '@/shared/components/sidebar';
import { AppMobileHeader } from '@/features/app-sidebar/app-mobile-header';
import { AppSidebar } from '@/features/app-sidebar/app-sidebar';
import { requireUser } from '@/features/auth/server/services/current-user.service';
import { appLayoutStyles } from './layout.styles';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
	const { name, role } = await requireUser();

	return (
		<MotionProvider>
			<div className={appLayoutStyles.page}>
				<GlowFrame className={appLayoutStyles.frame}>
					<SidebarProvider className={appLayoutStyles.shell}>
						<AppSidebar user={{ name, role }} />
						<SidebarInset>
							<AppMobileHeader />
							{children}
						</SidebarInset>
					</SidebarProvider>
				</GlowFrame>
			</div>
		</MotionProvider>
	);
}
