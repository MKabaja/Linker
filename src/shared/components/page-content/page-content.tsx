import { cn } from 'cn';
import type { ComponentProps } from 'react';
import { pageContentStyles } from './page-content.styles';

type PageContentProps = ComponentProps<'div'>;

export function PageContent({ className, ...props }: PageContentProps) {
	return (
		<div className={cn(pageContentStyles.content, className)} {...props} />
	);
}
