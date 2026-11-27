import type {
	ReturnItemCondition,
	ReturnKind,
	ReturnMatchedBy,
	ShopMatchingConfig,
} from '@/features/returns/model/returns.types';

const MAX_INTEGER_ID = 2_147_483_647;

type ReturnKindLabelByKind = Record<ReturnKind, string>;

type MatchedByLabelByMatchedBy = Record<ReturnMatchedBy, string>;

type ConditionLabelByCondition = Record<ReturnItemCondition, string>;

const defaultShopMatchingConfig: ShopMatchingConfig = {
	postcode: '32432',
	textMarkers: ['pcim', '720', 'kozacka', 'drogeria'],
	phoneSuffix: '9093',
	phone: '880729093',
	shopNameMasks: [
		['ko'],
		['ko', 'dr'],
		['ko', 'dr', 'ko', 'dr'],
		['kr'],
		['ko', 'sp'],
		['fi'],
		['dr'],
		['oz'],
	],
	orderIdPrefix: '3',
	orderIdLength: 9,
	shippingStatusIds: [327896, 327897, 327898, 338059, 358167, 165343],
};

const BONUS_TRACE_ID = 'bonus';

/** `order_source` syntetycznych zamówień z `npm run returns:seed`; po nim `--clear` je rozpoznaje i usuwa. */
const SEED_ORDER_SOURCE = 'seed';

const BASELINKER_PANEL_ORDER_URL =
	'https://panel-d.baselinker.com/orders.php#order:';

const RETURN_NOTE_MAX_LENGTH = 2000;

const returnKindLabelByKind: ReturnKindLabelByKind = {
	full: 'Pełny',
	partial: 'Częściowy',
};

const matchedByLabelByMatchedBy: MatchedByLabelByMatchedBy = {
	auto: 'Dopasowano automatycznie',
	'manual-pick': 'Wybrano ręcznie z listy',
	'manual-entry': 'Wpisano numer',
	imported: 'Import z demo',
};

const conditionLabelByCondition: ConditionLabelByCondition = {
	accepted: 'przyjęte',
	damaged: 'uszkodzone',
};

export {
	BASELINKER_PANEL_ORDER_URL,
	BONUS_TRACE_ID,
	conditionLabelByCondition,
	defaultShopMatchingConfig,
	MAX_INTEGER_ID,
	matchedByLabelByMatchedBy,
	RETURN_NOTE_MAX_LENGTH,
	returnKindLabelByKind,
	SEED_ORDER_SOURCE,
};
