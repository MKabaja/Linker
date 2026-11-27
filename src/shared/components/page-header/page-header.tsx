import type { ReactNode } from 'react';
import { pageHeaderStyles } from './page-header.styles';

type PageHeaderProps = {
	title: string;
	actions?: ReactNode;
};

export function PageHeader({ title, actions }: PageHeaderProps) {
	const { header, title: titleStyle, actions: actionsStyle } = pageHeaderStyles;

	return (
		<header className={header}>
			<h1 className={titleStyle}>{title}</h1>
			{actions && <div className={actionsStyle}>{actions}</div>}
		</header>
	);
}
