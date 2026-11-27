import { CopyableOrderValue } from '@/features/returns/components/copyable-order-value';
import {
	ReturnInfoField,
	ReturnInfoFields,
	ReturnInfoSection,
} from '@/features/returns/components/return-info-section';

type ReturnWaproProps = { wmsCode: string; waproOrderNumber: string };

export function ReturnWapro({ wmsCode, waproOrderNumber }: ReturnWaproProps) {
	return (
		<ReturnInfoSection title="WAPRO">
			<ReturnInfoFields>
				<ReturnInfoField label="WMS">
					<CopyableOrderValue label="kod WMS" value={wmsCode} variant="mono" />
				</ReturnInfoField>
				<ReturnInfoField label="ZO">
					<CopyableOrderValue label="numer ZO" value={waproOrderNumber} />
				</ReturnInfoField>
			</ReturnInfoFields>
		</ReturnInfoSection>
	);
}
