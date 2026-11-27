import {
	ReturnInfoField,
	ReturnInfoFields,
	ReturnInfoNotice,
	ReturnInfoSection,
} from '@/features/returns/components/return-info-section';
import type {
	OrderLiveDetailsResult,
	OrderPacking,
	ShipmentDate,
} from '@/features/returns/model/order-live.types';
import { formatWarsawDateTime } from '@/shared/lib/warsaw-time';
import { returnShippingStyles } from './return-shipping.styles';

type ReturnShippingProps = { result: OrderLiveDetailsResult };

type PackingValueProps = { packing: OrderPacking | null };

type ShipmentValueProps = { shipmentDate: ShipmentDate | null };

const EMPTY_VALUE = '—';

export function ReturnShipping({ result }: ReturnShippingProps) {
	if (result.status !== 'ok') {
		return (
			<ReturnInfoSection title="Wysyłka">
				<ReturnInfoNotice result={result} />
			</ReturnInfoSection>
		);
	}

	const { packageCount, packing, shipmentDate } = result.details.shipping;

	return (
		<ReturnInfoSection title="Wysyłka">
			<ReturnInfoFields>
				<ReturnInfoField label="Liczba paczek">{packageCount}</ReturnInfoField>
				<ReturnInfoField label="Pakował(a)">
					<PackingValue packing={packing} />
				</ReturnInfoField>
				<ReturnInfoField label="Wysłano">
					<ShipmentValue shipmentDate={shipmentDate} />
				</ReturnInfoField>
			</ReturnInfoFields>
		</ReturnInfoSection>
	);
}

function PackingValue({ packing }: PackingValueProps) {
	if (!packing) {
		return EMPTY_VALUE;
	}

	return (
		<>
			{packing.packerName || EMPTY_VALUE}
			<span className={returnShippingStyles.hint}>
				{' '}
				· {formatWarsawDateTime(packing.packedAt)}
			</span>
		</>
	);
}

function ShipmentValue({ shipmentDate }: ShipmentValueProps) {
	if (!shipmentDate) {
		return EMPTY_VALUE;
	}

	return (
		<>
			{formatWarsawDateTime(shipmentDate.at)}
			{shipmentDate.kind === 'labelCreated' && (
				<span className={returnShippingStyles.hint}> · etykieta utworzona</span>
			)}
		</>
	);
}
