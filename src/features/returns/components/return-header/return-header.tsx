import type { ReactNode } from 'react';
import { BaseLinkerOrderLink } from '@/features/returns/components/baselinker-order-link';
import { returnHeaderStyles } from './return-header.styles';

type ReturnHeaderProps = {
	orderId: number;
	source: string;
	statusLabel: string;
	dateLabel: string;
};

export function ReturnHeader({
	orderId,
	source,
	statusLabel,
	dateLabel,
}: ReturnHeaderProps) {
	const { header, title, meta } = returnHeaderStyles;

	return (
		<header className={header}>
			<h1 className={title}>
				Zwrot zamówienia <BaseLinkerOrderLink orderId={orderId} />
			</h1>
			<dl className={meta}>
				<HeaderField label="Źródło">{source}</HeaderField>
				<HeaderField label="Status">{statusLabel}</HeaderField>
				<HeaderField label="Przyjęto">{dateLabel}</HeaderField>
			</dl>
		</header>
	);
}

type HeaderFieldProps = { label: string; children: ReactNode };

function HeaderField({ label, children }: HeaderFieldProps) {
	return (
		<div>
			<dt className={returnHeaderStyles.label}>{label}</dt>
			<dd className={returnHeaderStyles.value}>{children}</dd>
		</div>
	);
}
