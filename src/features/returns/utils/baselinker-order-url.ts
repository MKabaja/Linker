import { BASELINKER_PANEL_ORDER_URL } from '@/features/returns/model/returns.constants';

export function getBaseLinkerOrderUrl(orderId: number): string {
	return `${BASELINKER_PANEL_ORDER_URL}${orderId}`;
}
