import { LogOut } from 'lucide-react';
import { SidebarMenuButton } from '@/shared/components/sidebar';
import { logOut } from '@/features/auth/actions';
import { logoutButtonStyles } from './logout-button.styles';

const LOGOUT_LABEL = 'Wyloguj się';

export function LogoutButton() {
	return (
		<form action={logOut}>
			<SidebarMenuButton type="submit" tooltip={LOGOUT_LABEL}>
				<LogOut />
				<span className={logoutButtonStyles.label}>{LOGOUT_LABEL}</span>
			</SidebarMenuButton>
		</form>
	);
}
