import {
	ReturnInfoField,
	ReturnInfoFields,
	ReturnInfoNotice,
	ReturnInfoSection,
} from '@/features/returns/components/return-info-section';
import type { OrderLiveDetailsResult } from '@/features/returns/model/order-live.types';

type ReturnCustomerProps = { result: OrderLiveDetailsResult };

const EMPTY_VALUE = '—';

export function ReturnCustomer({ result }: ReturnCustomerProps) {
	if (result.status !== 'ok') {
		return (
			<ReturnInfoSection title="Klient">
				<ReturnInfoNotice result={result} />
			</ReturnInfoSection>
		);
	}

	const { customer } = result.details;

	return (
		<ReturnInfoSection title="Klient">
			<ReturnInfoFields>
				<ReturnInfoField label="Imię i nazwisko lub firma">
					{customer.name || EMPTY_VALUE}
				</ReturnInfoField>
				<ReturnInfoField label="Login">
					{customer.login || EMPTY_VALUE}
				</ReturnInfoField>
				<ReturnInfoField label="Telefon">
					{customer.phone || EMPTY_VALUE}
				</ReturnInfoField>
				<ReturnInfoField label="E-mail">
					{customer.email || EMPTY_VALUE}
				</ReturnInfoField>
				<ReturnInfoField label="Adres dostawy">
					{customer.deliveryAddress || EMPTY_VALUE}
				</ReturnInfoField>
				<ReturnInfoField label="Sposób wysyłki">
					{customer.deliveryMethod || EMPTY_VALUE}
				</ReturnInfoField>
				<ReturnInfoField label="Płatność">
					{customer.paymentMethod || EMPTY_VALUE}
				</ReturnInfoField>
			</ReturnInfoFields>
		</ReturnInfoSection>
	);
}
