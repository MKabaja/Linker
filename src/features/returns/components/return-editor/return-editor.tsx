'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { ReturnKindChip } from '@/features/returns/components/return-kind-chip';
import type { ImageUrlByItemId } from '@/features/returns/model/product-images.types';
import type { ReturnItem } from '@/features/returns/model/returns.types';
import { getReturnKind } from '@/features/returns/utils/return-kind';
import { ReturnItemRow } from './return-editor.item-row';
import { saveReturnChanges } from './return-editor.save';
import { returnEditorStyles } from './return-editor.styles';

type ReturnEditorProps = {
	returnId: number;
	items: ReturnItem[];
	imageUrlByItemIdPromise: Promise<ImageUrlByItemId>;
};

type QuantityChange = { itemId: number; quantityReceived: number };

export function ReturnEditor({
	returnId,
	items,
	imageUrlByItemIdPromise,
}: ReturnEditorProps) {
	const { root, summary, heading, list, error } = returnEditorStyles;
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSaving, startTransition] = useTransition();
	const [shownItems, showQuantityChange] = useOptimistic(
		items,
		applyQuantityChange,
	);

	function changeQuantity(item: ReturnItem, quantityReceived: number) {
		startTransition(async () => {
			showQuantityChange({ itemId: item.id, quantityReceived });
			setErrorMessage(
				await saveReturnChanges({
					returnId,
					items: [{ id: item.id, quantityReceived }],
				}),
			);
		});
	}

	return (
		<div className={root}>
			<div className={summary}>
				<h2 className={heading}>Pozycje</h2>
				<ReturnKindChip kind={getReturnKind(shownItems)} />
			</div>
			{errorMessage && (
				<p role="alert" className={error}>
					{errorMessage}
				</p>
			)}
			<ul className={list}>
				{shownItems.map((item) => (
					<ReturnItemRow
						key={item.id}
						item={item}
						imageUrlByItemIdPromise={imageUrlByItemIdPromise}
						isDisabled={isSaving}
						onQuantityChange={changeQuantity}
					/>
				))}
			</ul>
		</div>
	);
}

function applyQuantityChange(
	items: ReturnItem[],
	{ itemId, quantityReceived }: QuantityChange,
): ReturnItem[] {
	return items.map((item) =>
		item.id === itemId ? { ...item, quantityReceived } : item,
	);
}
