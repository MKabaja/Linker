import Link from 'next/link';
import { buttonVariants } from '@/shared/components/button';
import { scanNextLinkStyles } from './scan-next-link.styles';

export function ScanNextLink() {
	return (
		<Link
			href="/returns/scan"
			className={buttonVariants({
				variant: 'accent',
				size: 'lg',
				className: scanNextLinkStyles.link,
			})}
		>
			Skanuj następną
		</Link>
	);
}
