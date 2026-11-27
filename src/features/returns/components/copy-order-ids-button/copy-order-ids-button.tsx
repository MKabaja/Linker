'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/button';

type CopyOrderIdsButtonProps = { orderIds: number[] };

export function CopyOrderIdsButton({ orderIds }: CopyOrderIdsButtonProps) {
	async function copyOrderIds() {
		try {
			await navigator.clipboard.writeText(orderIds.join('\n'));
			toast.success(`Skopiowano ID zamówień: ${orderIds.length}`);
		} catch {
			toast.error('Nie udało się skopiować ID zamówień');
		}
	}

	return (
		<Button
			variant="outline"
			disabled={orderIds.length === 0}
			onClick={copyOrderIds}
		>
			<Copy />
			Kopiuj ID
		</Button>
	);
}
