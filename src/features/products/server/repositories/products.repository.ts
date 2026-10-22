import 'server-only';
import type { PrimaveraProductsResult } from '@/features/products/model/products.types';
import { getCachedPrimaveraProducts } from './products.cache';

/**
 * Zwraca produkty z Primavery z pamięci serwera. Dane młodsze niż minuta
 * wracają od razu, starsze do 5 minut wracają od razu i odświeżają się w tle,
 * a starsze lub brakujące są pobierane przed zwróceniem. Błędy pobierania
 * i parsowania wracają jako wynik ze statusem `error`.
 */
export async function getPrimaveraProducts(): Promise<PrimaveraProductsResult> {
	try {
		const snapshot = await getCachedPrimaveraProducts();
		return { status: 'ok', ...snapshot };
	} catch (error) {
		console.error('Nie udało się pobrać produktów z Primavery', error);
		return { status: 'error', message: getErrorMessage(error) };
	}
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Nieznany błąd';
}
