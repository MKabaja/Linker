import type { ReactNode } from 'react';
import { BaseLinkerOrderLink } from '@/features/returns/components/baselinker-order-link';
import { returnHeaderStyles } from './return-header.styles';

type ReturnHeaderProps = {
	orderId: number;
	/** Przewoźnik z dopasowania; `null`, gdy nie udało się go rozpoznać. */
	carrierLabel: string | null;
	source: string;
	statusLabel: string;
	receivedLabel: string;
};

export function ReturnHeader({
	orderId,
	carrierLabel,
	source,
	statusLabel,
	receivedLabel,
}: ReturnHeaderProps) {
	const { header, title, meta } = returnHeaderStyles;

	return (
		<header className={header}>
			<h1 className={title}>
				Zwrot zamówienia <BaseLinkerOrderLink orderId={orderId} />
			</h1>
			<ul className={meta}>
				{carrierLabel && <MetaItem>{carrierLabel}</MetaItem>}
				<MetaItem>{source}</MetaItem>
				<MetaItem>{statusLabel}</MetaItem>
				<MetaItem>{receivedLabel}</MetaItem>
			</ul>
		</header>
	);
}

type MetaItemProps = { children: ReactNode };

function MetaItem({ children }: MetaItemProps) {
	return <li className={returnHeaderStyles.metaItem}>{children}</li>;
}
