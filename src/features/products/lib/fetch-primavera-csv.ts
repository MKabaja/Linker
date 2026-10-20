import {
	PRIMAVERA_FETCH_TIMEOUT_MS,
	PRIMAVERA_PRICELIST_URL,
} from '../constants/primavera.constants';

export async function fetchPrimaveraCsv(): Promise<string> {
	const response = await fetch(buildPricelistUrl(getPrimaveraToken()), {
		cache: 'no-store',
		signal: AbortSignal.timeout(PRIMAVERA_FETCH_TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(`Primavera zwróciła status ${response.status}`);
	}

	const csvContent = await response.text();

	if (csvContent.trim() === '') {
		throw new Error('Primavera zwróciła pusty plik');
	}

	return csvContent;
}

function getPrimaveraToken(): string {
	const token = process.env.PRIMAVERA_TOKEN;

	if (!token) {
		throw new Error('Brak zmiennej środowiskowej PRIMAVERA_TOKEN');
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
