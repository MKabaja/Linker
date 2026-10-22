import type { PrimaveraProductsSnapshot } from '@/features/products/model/products.types';
import {
	PRIMAVERA_CACHE_EXPIRE_MS,
	PRIMAVERA_CACHE_FRESH_MS,
} from '../constants/primavera.constants';
import { parsePrimaveraCsv } from './csv-parser';
import { fetchPrimaveraCsv } from './fetch-primavera-csv';

type SnapshotFreshness = 'fresh' | 'stale' | 'expired';

type SnapshotResolver = (
	snapshot: PrimaveraProductsSnapshot,
) => PrimaveraProductsSnapshot | Promise<PrimaveraProductsSnapshot>;

type SnapshotResolverByFreshness = Record<SnapshotFreshness, SnapshotResolver>;

const resolverByFreshness: SnapshotResolverByFreshness = {
	fresh: (snapshot) => snapshot,
	stale: (snapshot) => {
		refreshInBackground();
		return snapshot;
	},
	expired: () => refreshSnapshot(),
};

let cachedSnapshot: PrimaveraProductsSnapshot | null = null;
let pendingRefresh: Promise<PrimaveraProductsSnapshot> | null = null;

export async function getCachedPrimaveraProducts(): Promise<PrimaveraProductsSnapshot> {
	const snapshot = cachedSnapshot;

	if (!snapshot) {
		return refreshSnapshot();
	}

	const freshness = getSnapshotFreshness(snapshot.fetchedAt, new Date());
	return resolverByFreshness[freshness](snapshot);
}

function getSnapshotFreshness(fetchedAt: Date, now: Date): SnapshotFreshness {
	const millisecondsSinceFetch = now.getTime() - fetchedAt.getTime();

	if (millisecondsSinceFetch < PRIMAVERA_CACHE_FRESH_MS) {
		return 'fresh';
	}

	if (millisecondsSinceFetch < PRIMAVERA_CACHE_EXPIRE_MS) {
		return 'stale';
	}

	return 'expired';
}

function refreshInBackground() {
	refreshSnapshot().catch((error) => {
		console.error('Nie udało się odświeżyć produktów z Primavery w tle', error);
	});
}

function refreshSnapshot(): Promise<PrimaveraProductsSnapshot> {
	pendingRefresh ??= loadSnapshot().finally(() => {
		pendingRefresh = null;
	});

	return pendingRefresh;
}

async function loadSnapshot(): Promise<PrimaveraProductsSnapshot> {
	const csvContent = await fetchPrimaveraCsv();
	const snapshot = {
		products: parsePrimaveraCsv(csvContent),
		fetchedAt: new Date(),
	};

	cachedSnapshot = snapshot;
	return snapshot;
}
