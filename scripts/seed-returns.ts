import { loadEnvConfig } from '@next/env';
import type {
	IndexedOrderItem,
	IndexedPackage,
	OrderIndexEntry,
} from '@/features/returns/model/order-index.types';
import {
	defaultShopMatchingConfig,
	SEED_ORDER_SOURCE,
} from '@/features/returns/model/returns.constants';
import { isInpostReturnNumber } from '@/features/returns/utils/carrier';
import {
	normalizeText,
	splitFullName,
} from '@/features/returns/utils/normalize-text';

type Random = () => number;

type SeedProduct = { name: string; ean: string; sku: string };

type SeedEntryRequest = {
	orderId: number;
	now: Date;
	random: Random;
	products: SeedProduct[];
	usedPackageNumbers: Set<string>;
};

type SeedItemsRequest = {
	orderId: number;
	random: Random;
	products: SeedProduct[];
};

type PackageFactory = {
	courierCode: string;
	createNumber: (random: Random) => string;
};

const ORDER_COUNT = 2000;
const FIRST_ORDER_ID = 399_900_001;
const RANDOM_SEED = 20_261_125;
const MAX_AGE_DAYS = 44;
const MILLISECONDS_PER_DAY = 86_400_000;
const MULTI_PACKAGE_RATIO = 0.1;
const SAMPLE_ORDERS = 3;

const FIRST_NAMES = [
	'Anna',
	'Maria',
	'Katarzyna',
	'Małgorzata',
	'Agnieszka',
	'Barbara',
	'Ewa',
	'Krystyna',
	'Elżbieta',
	'Zofia',
	'Piotr',
	'Krzysztof',
	'Andrzej',
	'Tomasz',
	'Paweł',
	'Michał',
	'Łukasz',
	'Jakub',
	'Marcin',
	'Grzegorz',
];
const LAST_NAMES = [
	'Nowak',
	'Kowalska',
	'Wiśniewska',
	'Wójcik',
	'Kowalczyk',
	'Kamińska',
	'Lewandowski',
	'Zieliński',
	'Szymański',
	'Woźniak',
	'Dąbrowski',
	'Kozłowska',
	'Jankowski',
	'Mazur',
	'Kwiatkowska',
	'Krawczyk',
	'Piotrowski',
	'Grabowska',
	'Nowakowski',
	'Pawłowska',
];
const CITIES = [
	'Kraków',
	'Warszawa',
	'Łódź',
	'Wrocław',
	'Poznań',
	'Gdańsk',
	'Szczecin',
	'Bydgoszcz',
	'Lublin',
	'Białystok',
	'Katowice',
	'Gdynia',
	'Częstochowa',
	'Radom',
	'Toruń',
	'Kielce',
	'Rzeszów',
	'Gliwice',
	'Zabrze',
	'Olsztyn',
];
const PRODUCT_NAMES = [
	'Krem do rąk 75 ml',
	'Szampon ziołowy 400 ml',
	'Mydło w płynie 500 ml',
	'Balsam do ciała 250 ml',
	'Pasta do zębów 100 ml',
	'Żel pod prysznic 300 ml',
	'Odżywka do włosów 200 ml',
	'Płyn micelarny 400 ml',
	'Krem do twarzy 50 ml',
	'Dezodorant 150 ml',
	'Maseczka do twarzy 10 ml',
	'Olejek do kąpieli 250 ml',
	'Peeling cukrowy 200 g',
	'Pomadka ochronna 4,8 g',
	'Lakier do paznokci 10 ml',
	'Tonik do twarzy 200 ml',
	'Sól do kąpieli 1 kg',
	'Krem do stóp 100 ml',
	'Serum do włosów 50 ml',
	'Puder sypki 15 g',
];

const packageFactories: PackageFactory[] = [
	{ courierCode: 'paczkomaty', createNumber: createInpostNumber },
	{ courierCode: 'inpostkurier', createNumber: createInpostNumber },
	{ courierCode: 'dpd', createNumber: (random) => `${digits(random, 13)}U` },
	{ courierCode: 'dhl', createNumber: (random) => `317${digits(random, 8)}` },
	{ courierCode: 'dhl', createNumber: (random) => `JJD${digits(random, 18)}` },
];

main();

async function main() {
	loadEnvConfig(process.cwd());
	const { clearSeededOrders, seedOrderIndex } = await import(
		'@/features/returns/server/services/order-index-seed.service'
	);

	if (process.argv.includes('--clear')) {
		const removedOrders = await clearSeededOrders();
		console.log(`Usunięto ${removedOrders} syntetycznych zamówień.`);
		process.exit(0);
	}

	const now = new Date();
	const entries = createSeedEntries(now);
	const summary = await seedOrderIndex(entries, now);

	console.log(
		`Usunięto ${summary.removedOrders}, dodano ${summary.insertedOrders} syntetycznych zamówień (order_source = '${SEED_ORDER_SOURCE}').`,
	);
	console.log('Przykłady do testów wyszukiwania:');
	for (const { order, packages } of entries.slice(0, SAMPLE_ORDERS)) {
		const numbers = packages.map(
			(indexedPackage) => indexedPackage.packageNumber,
		);
		console.log(`  ${order.orderId}: ${numbers.join(', ')}`);
	}
	console.log('Indeks w działającym serwerze odświeży się w ciągu 2 minut.');
	process.exit(0);
}

function createSeedEntries(now: Date): OrderIndexEntry[] {
	const random = createRandom(RANDOM_SEED);
	const products = createProducts(random);
	const usedPackageNumbers = new Set<string>();

	return Array.from({ length: ORDER_COUNT }, (_, index) =>
		createEntry({
			orderId: FIRST_ORDER_ID + index,
			now,
			random,
			products,
			usedPackageNumbers,
		}),
	);
}

function createEntry({
	orderId,
	now,
	random,
	products,
	usedPackageNumbers,
}: SeedEntryRequest): OrderIndexEntry {
	const fullName = `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`;
	const { firstName, lastName } = splitFullName(fullName, '');
	const dateAdd = new Date(
		now.getTime() - random() * MAX_AGE_DAYS * MILLISECONDS_PER_DAY,
	);
	const packageCount =
		random() < MULTI_PACKAGE_RATIO ? 2 + Math.floor(random() * 2) : 1;

	return {
		order: {
			orderId,
			externalOrderId: createExternalOrderId(random),
			source: SEED_ORDER_SOURCE,
			sourceId: 1 + Math.floor(random() * 5),
			statusId: pick(random, defaultShopMatchingConfig.shippingStatusIds),
			dateAdd,
			dateConfirmed: new Date(dateAdd.getTime() + random() * 7_200_000),
			firstNameNormalized: firstName,
			lastNameNormalized: lastName,
			phoneDigits: `${5 + Math.floor(random() * 4)}${digits(random, 8)}`,
			postcode: digits(random, 5),
			cityNormalized: normalizeText(pick(random, CITIES)),
		},
		items: createItems({ orderId, random, products }),
		packages: Array.from({ length: packageCount }, () =>
			createPackage(random, usedPackageNumbers),
		),
	};
}

function createItems({
	orderId,
	random,
	products,
}: SeedItemsRequest): IndexedOrderItem[] {
	const itemCount = 1 + Math.floor(random() * 3);

	return Array.from({ length: itemCount }, (_, position) => ({
		position,
		orderProductId: orderId * 10 + position,
		productId: '',
		...pick(random, products),
		quantity: 1 + Math.floor(random() * 3),
	}));
}

function createPackage(
	random: Random,
	usedPackageNumbers: Set<string>,
): IndexedPackage {
	const factory = pick(random, packageFactories);
	let packageNumber = factory.createNumber(random);

	while (usedPackageNumbers.has(packageNumber)) {
		packageNumber = factory.createNumber(random);
	}

	usedPackageNumbers.add(packageNumber);
	return { packageNumber, innerNumber: '', courierCode: factory.courierCode };
}

function createInpostNumber(random: Random): string {
	const packageNumber = `6209996${digits(random, 17)}`;
	return isInpostReturnNumber(packageNumber)
		? createInpostNumber(random)
		: packageNumber;
}

function createExternalOrderId(random: Random): string {
	const variant = random();

	if (variant < 0.4) {
		return createUuid(random);
	}

	return variant < 0.6 ? `${digits(random, 6)}x${digits(random, 5)}` : '';
}

function createUuid(random: Random): string {
	const hex = Array.from({ length: 32 }, () =>
		Math.floor(random() * 16).toString(16),
	).join('');

	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20),
	].join('-');
}

function createProducts(random: Random): SeedProduct[] {
	return PRODUCT_NAMES.map((name, index) => ({
		name,
		ean: `590${digits(random, 10)}`,
		sku: `SEED-${String(index + 1).padStart(3, '0')}`,
	}));
}

function digits(random: Random, length: number): string {
	return Array.from({ length }, () => Math.floor(random() * 10)).join('');
}

function pick<T>(random: Random, values: readonly T[]): T {
	return values[Math.floor(random() * values.length)];
}

function createRandom(seed: number): Random {
	let state = seed;

	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
		mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
	};
}
