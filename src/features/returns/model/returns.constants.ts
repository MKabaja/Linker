import type { ShopMatchingConfig } from '@/features/returns/model/returns.types';

const defaultShopMatchingConfig: ShopMatchingConfig = {
	postcode: '32432',
	textMarkers: ['pcim', '720', 'kozacka', 'drogeria'],
	phoneSuffix: '9093',
	orderIdPrefix: '3',
	orderIdLength: 9,
	shippingStatusIds: [327896, 327897, 327898, 338059, 358167, 165343],
};

const BONUS_TRACE_ID = 'bonus';

/** `order_source` syntetycznych zamówień z `npm run returns:seed`; po nim `--clear` je rozpoznaje i usuwa. */
const SEED_ORDER_SOURCE = 'seed';

export { BONUS_TRACE_ID, defaultShopMatchingConfig, SEED_ORDER_SOURCE };
