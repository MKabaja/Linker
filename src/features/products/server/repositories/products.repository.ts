import 'server-only';
import type {
	PrimaveraErrorCode,
	PrimaveraProductsResult,
} from '@/features/products/model/products.types';
import { PrimaveraError } from '@/features/products/server/sources/primavera.errors';
import { getCachedPrimaveraProducts } from './products.cache';

/**
 * Zwraca produkty z Primavery z pamięci serwera.
 *
 * Nie rzuca: błąd pobrania lub odczytu wraca jako `status: 'error'` z kodem.
 * Dane starsze niż minuta odświeżają się w tle, starsze niż 5 minut przed zwróceniem.
 */
export async function findAllProducts(): Promise<PrimaveraProductsResult> {
	try {
		const snapshot = await getCachedPrimaveraProducts();
		return { status: 'ok', ...snapshot };
	} catch (error) {
		console.error('Nie udało się pobrać produktów z Primavery', error);
		return { status: 'error', code: getPrimaveraErrorCode(error) };
	}
}

function getPrimaveraErrorCode(error: unknown): PrimaveraErrorCode {
	return error instanceof PrimaveraError ? error.code : 'UNKNOWN';
}
