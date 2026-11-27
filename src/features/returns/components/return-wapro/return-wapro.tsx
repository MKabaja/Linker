import { CopyableOrderValue } from '@/features/returns/components/copyable-order-value';
import { ReturnInfoField } from '@/features/returns/components/return-info-section';
import { returnWaproStyles } from './return-wapro.styles';

type ReturnWaproProps = { wmsCode: string; waproOrderNumber: string };

export function ReturnWapro({ wmsCode, waproOrderNumber }: ReturnWaproProps) {
	return (
		<dl className={returnWaproStyles.fields}>
			<ReturnInfoField label="WMS">
				<CopyableOrderValue label="kod WMS" value={wmsCode} variant="mono" />
			</ReturnInfoField>
			<ReturnInfoField label="ZO">
				<CopyableOrderValue label="numer ZO" value={waproOrderNumber} />
			</ReturnInfoField>
		</dl>
	);
}
