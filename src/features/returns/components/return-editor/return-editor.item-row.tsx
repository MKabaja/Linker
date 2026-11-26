import { Minus, Plus } from 'lucide-react';
import { Button } from '@/shared/components/button';
import type { ReturnItem } from '@/features/returns/model/returns.types';
import { returnItemRowStyles } from './return-editor.styles';

type ReturnItemRowProps = {
	item: ReturnItem;
	isDisabled: boolean;
	onQuantityChange: (item: ReturnItem, quantityReceived: number) => void;
};

const MAX_RECEIVED_QUANTITY = 999;

export function ReturnItemRow({
	item,
	isDisabled,
	onQuantityChange,
}: ReturnItemRowProps) {
	const {
		row,
		description,
		name,
		codes,
		damaged,
		stepper,
		stepButton,
		counter,
		surplusCounter,
		ordered,
	} = returnItemRowStyles;
	const canDecrease = item.quantityReceived > 0;
	const canIncrease = item.quantityReceived < MAX_RECEIVED_QUANTITY;
	const hasSurplus = item.quantityReceived > item.quantityOrdered;

	return (
		<li className={row}>
			<div className={description}>
				<span className={name}>{item.name}</span>
				<span className={codes}>
					{item.ean && <span>EAN {item.ean}</span>}
					{item.sku && <span>SKU {item.sku}</span>}
				</span>
				{item.condition === 'damaged' && (
					<span className={damaged}>Uszkodzone</span>
				)}
			</div>
			<div className={stepper}>
				<Button
					variant="outline"
					className={stepButton}
					aria-label={`Zmniejsz liczbę przyjętych sztuk: ${item.name}`}
					disabled={isDisabled || !canDecrease}
					onClick={() => onQuantityChange(item, item.quantityReceived - 1)}
				>
					<Minus />
				</Button>
				<output className={hasSurplus ? surplusCounter : counter}>
					{item.quantityReceived}
					<span className={ordered}> / {item.quantityOrdered}</span>
				</output>
				<Button
					variant="outline"
					className={stepButton}
					aria-label={`Zwiększ liczbę przyjętych sztuk: ${item.name}`}
					disabled={isDisabled || !canIncrease}
					onClick={() => onQuantityChange(item, item.quantityReceived + 1)}
				>
					<Plus />
				</Button>
			</div>
		</li>
	);
}
