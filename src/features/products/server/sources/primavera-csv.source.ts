import 'server-only';
import { primaveraErrorResponseSchema } from '@/features/products/model/products.schemas';
import type { PrimaveraErrorCode } from '@/features/products/model/products.types';
import {
	PRIMAVERA_FETCH_TIMEOUT_MS,
	PRIMAVERA_PRICELIST_URL,
} from './primavera.config';
import { PrimaveraError } from './primavera.errors';

const UNAUTHORIZED_STATUSES = new Set([401, 403]);
const ACCESS_DENIED_PATTERN = /access den/i;

/**
 * Pobiera cennik Primavery jako tekst CSV.
 *
 * Primavera zgłasza zły token statusem 200 z JSON-em `{ msg }` zamiast CSV.
 *
 * @throws {@link PrimaveraError} z kodem `MISSING_TOKEN`, `UNAUTHORIZED`,
 * `UNAVAILABLE` (timeout, błąd sieci, zły status), `EMPTY_RESPONSE` albo
 * `UNKNOWN` (inny komunikat błędu API).
 */
export async function fetchPrimaveraCsv(): Promise<string> {
	const response = await requestPricelist(getPrimaveraToken());

	if (UNAUTHORIZED_STATUSES.has(response.status)) {
		throw new PrimaveraError('UNAUTHORIZED');
	}

	if (!response.ok) {
		throw new PrimaveraError('UNAVAILABLE', {
			cause: new Error(`Status ${response.status}`),
		});
	}

	const csvContent = await response.text();

	if (csvContent.trim() === '') {
		throw new PrimaveraError('EMPTY_RESPONSE');
	}

	const apiErrorMessage = findApiErrorMessage(csvContent);

	if (apiErrorMessage !== null) {
		throw new PrimaveraError(getApiErrorCode(apiErrorMessage), {
			cause: new Error(apiErrorMessage),
		});
	}

	return csvContent;
}

function findApiErrorMessage(responseText: string): string | null {
	if (!responseText.trimStart().startsWith('{')) {
		return null;
	}

	try {
		const validation = primaveraErrorResponseSchema.safeParse(
			JSON.parse(responseText),
		);
		return validation.success ? validation.data.msg : null;
	} catch {
		return null;
	}
}

function getApiErrorCode(apiErrorMessage: string): PrimaveraErrorCode {
	return ACCESS_DENIED_PATTERN.test(apiErrorMessage)
		? 'UNAUTHORIZED'
		: 'UNKNOWN';
}

async function requestPricelist(token: string): Promise<Response> {
	try {
		return await fetch(buildPricelistUrl(token), {
			cache: 'no-store',
			signal: AbortSignal.timeout(PRIMAVERA_FETCH_TIMEOUT_MS),
		});
	} catch (error) {
		throw new PrimaveraError('UNAVAILABLE', { cause: error });
	}
}

function getPrimaveraToken(): string {
	const token = process.env.PRIMAVERA_TOKEN;

	if (!token) {
		throw new PrimaveraError('MISSING_TOKEN');
	}

	return token;
}

function buildPricelistUrl(token: string): string {
	const url = new URL(PRIMAVERA_PRICELIST_URL);
	url.search = new URLSearchParams({
		wh: 'all',
		token,
		format: 'csv',
	}).toString();
	return url.toString();
}
