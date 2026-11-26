import { ExternalLink } from 'lucide-react';
import { getBaseLinkerOrderUrl } from '@/features/returns/utils/baselinker-order-url';
import { baselinkerOrderLinkStyles } from './baselinker-order-link.styles';

type BaseLinkerOrderLinkProps = { orderId: number };

export function BaseLinkerOrderLink({ orderId }: BaseLinkerOrderLinkProps) {
	const { link, icon } = baselinkerOrderLinkStyles;

	return (
		<a
			href={getBaseLinkerOrderUrl(orderId)}
			target="_blank"
			rel="noopener noreferrer"
			className={link}
		>
			{orderId}
			<ExternalLink className={icon} aria-hidden="true" />
			<span className="sr-only">(otwiera BaseLinker w nowej karcie)</span>
		</a>
	);
}
