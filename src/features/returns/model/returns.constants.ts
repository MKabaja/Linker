import type {
	ReturnItemCondition,
	ReturnKind,
	ShopMatchingConfig,
} from '@/features/returns/model/returns.types';

type ReturnKindLabelByKind = Record<ReturnKind, string>;

type ConditionLabelByCondition = Record<ReturnItemCondition, string>;

const defaultShopMatchingConfig: ShopMatchingConfig = {
	postcode: '32432',
	textMarkers: ['pcim', '720', 'kozacka', 'drogeria'],
	phoneSuffix: '9093',
	shopNameMasks: [['ko'], ['ko', 'dr']],
	orderIdPrefix: '3',
	orderIdLength: 9,
	shippingStatusIds: [327896, 327897, 327898, 338059, 358167, 165343],
};

const BONUS_TRACE_ID = 'bonus';

/** `order_source` syntetycznych zamówień z `npm run returns:seed`; po nim `--clear` je rozpoznaje i usuwa. */
const SEED_ORDER_SOURCE = 'seed';

const RETURN_NOTE_MAX_LENGTH = 2000;

const returnKindLabelByKind: ReturnKindLabelByKind = {
	full: 'Pełny',
	partial: 'Częściowy',
};

const conditionLabelByCondition: ConditionLabelByCondition = {
	accepted: 'przyjęte',
	damaged: 'uszkodzone',
};

export {
	BONUS_TRACE_ID,
	conditionLabelByCondition,
	defaultShopMatchingConfig,
	RETURN_NOTE_MAX_LENGTH,
	returnKindLabelByKind,
	SEED_ORDER_SOURCE,
};
