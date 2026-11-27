import { type ReactNode, useId } from 'react';
import type { OrderLiveDetailsResult } from '@/features/returns/model/order-live.types';
import { returnInfoSectionStyles } from './return-info-section.styles';

type ReturnInfoSectionProps = { title: string; children: ReactNode };

type ReturnInfoFieldsProps = { children: ReactNode };

type ReturnInfoFieldProps = { label: string; children: ReactNode };

type ReturnInfoNoticeProps = {
	result: Exclude<OrderLiveDetailsResult, { status: 'ok' }>;
};

export function ReturnInfoSection({ title, children }: ReturnInfoSectionProps) {
	const headingId = useId();
	const { section, heading, card } = returnInfoSectionStyles;

	return (
		<section aria-labelledby={headingId} className={section}>
			<h2 id={headingId} className={heading}>
				{title}
			</h2>
			<div className={card}>{children}</div>
		</section>
	);
}

export function ReturnInfoFields({ children }: ReturnInfoFieldsProps) {
	return <dl className={returnInfoSectionStyles.fields}>{children}</dl>;
}

export function ReturnInfoField({ label, children }: ReturnInfoFieldProps) {
	const { label: labelStyle, value } = returnInfoSectionStyles;

	return (
		<div>
			<dt className={labelStyle}>{label}</dt>
			<dd className={value}>{children}</dd>
		</div>
	);
}

export function ReturnInfoNotice({ result }: ReturnInfoNoticeProps) {
	const { notice, error } = returnInfoSectionStyles;

	if (result.status === 'disabled') {
		return <p className={notice}>Integracja z BaseLinkerem jest wyłączona.</p>;
	}

	return (
		<p role="alert" className={error}>
			Nie udało się pobrać danych z BaseLinkera: {result.message}
		</p>
	);
}
