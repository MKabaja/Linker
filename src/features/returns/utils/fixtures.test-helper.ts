import type {
	IndexedOrder,
	ScoringOptions,
} from '@/features/returns/model/order-scoring.types';
import { defaultShopMatchingConfig } from '@/features/returns/model/returns.constants';

const FIRST_NAMES = [
	'anna',
	'piotr',
	'jan',
	'ewa',
	'tomasz',
	'zofia',
	'adam',
	'ola',
	'pawel',
	'kasia',
	'monika',
	'robert',
	'beata',
	'lukasz',
	'iga',
	'dawid',
	'hanna',
	'jakub',
	'nina',
	'wiktor',
];
const LAST_NAMES = [
	'nowak',
	'lis',
	'wrona',
	'sowa',
	'zajac',
	'bak',
	'kos',
	'dudek',
	'pawlak',
	'sikora',
	'baran',
	'wilk',
	'olszak',
	'kalina',
	'gajda',
	'rutka',
	'socha',
	'tracz',
	'urban',
	'wolny',
	'zych',
	'jasny',
	'fiut',
	'pruszek',
	'adamek',
	'cichy',
	'domin',
	'ernest',
	'filipek',
	'mazur',
];

const SHIPPING_STATUS = 900;
const OTHER_STATUS = 100;
const NOW_MS = Date.UTC(2026, 10, 18, 12);
const SECONDS_PER_DAY = 86_400;
const INDEX_DAYS = 45;
const TARGET_AGE_DAYS = 10;
const INPOST_PREFIX = '6209996691';

const SCORING_OPTIONS: ScoringOptions = {
	nowMs: NOW_MS,
	shop: { ...defaultShopMatchingConfig, shippingStatusIds: [SHIPPING_STATUS] },
};

type OrderOverrides = Partial<IndexedOrder> & { orderId: number };

const LABEL_CODES = {
	inpostAllegroReturn: '600000276632432022076273',
	inpost: ['620999667432432409166164', '632432176632432034601449'],
	orlen: '2102986472869',
	dpdFull: ['%10324321055513876329U101616', '%10324321055932027487U101616'],
	dpdParcel: ['1055513876329U', '1055932027487U'],
	dhl: ['31863808287', 'JJD000030107342000000063857'],
	dhlRouting: '2LPL32432+81000000',
	allegroOne: 'A0066RM3O6',
	allegroOneOther: 'A006A485G0',
	returnReferenceText: 'Zwrot: NZ5J/2026',
} as const;

const ALLEGRO_ONE_ORDER_ID = 356_294_791;

const ALLEGRO_ONE_PARCELS = [
	'A0066RM3O6',
	'A0065KBBY3',
	'A0065K8YU5',
	'A0065KB9D7',
] as const;

/**
 * Zamówienia z prawdziwymi numerami Allegro One z indeksu; `A0066RM3O6` to zamówienie 356294791.
 */
function makeAllegroOneOrders(): IndexedOrder[] {
	return ALLEGRO_ONE_PARCELS.map((packageNumber, index) =>
		makeOrder({
			orderId: ALLEGRO_ONE_ORDER_ID + index,
			packageNumbers: [packageNumber],
		}),
	);
}

function createRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function generateOrders(count: number, seed = 42): IndexedOrder[] {
	const random = createRandom(seed);
	const nowSeconds = Math.floor(NOW_MS / 1000);
	const orders: IndexedOrder[] = [];
	for (let index = 0; index < count; index++) {
		const carrierRoll = random();
		const packageNumbers =
			carrierRoll < 0.6
				? [INPOST_PREFIX + randomDigits(random, 14)]
				: carrierRoll < 0.85
					? [`10${randomDigits(random, 11)}U`]
					: [];
		const date =
			nowSeconds - Math.floor(random() * INDEX_DAYS * SECONDS_PER_DAY);
		orders.push({
			orderId: 310_000_000 + index * 3 + Math.floor(random() * 3),
			externalOrderId: `${randomDigits(random, 4)}X${randomDigits(random, 6)}`,
			source: 'shop',
			statusId: random() < 0.7 ? SHIPPING_STATUS : OTHER_STATUS,
			dateAdd: date,
			dateConfirmed: date,
			phoneDigits:
				random() < 0.95
					? `${5 + Math.floor(random() * 4)}${randomDigits(random, 8)}`
					: '',
			firstNameNorm: FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)],
			lastNameNorm: LAST_NAMES[Math.floor(random() * LAST_NAMES.length)],
			postcode: randomDigits(random, 5),
			cityNorm: 'miasto',
			packageNumbers,
		});
	}
	return orders;
}

function makeOrder(overrides: OrderOverrides): IndexedOrder {
	const date = Math.floor(NOW_MS / 1000) - TARGET_AGE_DAYS * SECONDS_PER_DAY;
	return {
		externalOrderId: '',
		source: 'shop',
		statusId: SHIPPING_STATUS,
		dateAdd: date,
		dateConfirmed: date,
		phoneDigits: '',
		firstNameNorm: 'xavier',
		lastNameNorm: 'quint',
		postcode: '99999',
		cityNorm: 'miasto',
		packageNumbers: [],
		...overrides,
	};
}

function randomDigits(random: () => number, count: number): string {
	let text = '';
	for (let index = 0; index < count; index++) {
		text += Math.floor(random() * 10);
	}
	return text;
}

export {
	ALLEGRO_ONE_ORDER_ID,
	ALLEGRO_ONE_PARCELS,
	createRandom,
	generateOrders,
	INPOST_PREFIX,
	LABEL_CODES,
	makeAllegroOneOrders,
	makeOrder,
	type OrderOverrides,
	SCORING_OPTIONS,
};
