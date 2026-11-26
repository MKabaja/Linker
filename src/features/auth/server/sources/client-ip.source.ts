import 'server-only';
import { headers } from 'next/headers';

const UNKNOWN_IP = 'unknown';

/**
 * Zwraca adres klienta z nagłówków proxy.
 *
 * @remarks
 * Ufa nagłówkom `x-forwarded-for` (pierwszy adres) i `x-real-ip`, więc jest bezpieczne tylko
 * za reverse proxy, które je nadpisuje. Bez nagłówków wszyscy klienci dzielą wspólny wpis `unknown`.
 */
async function readClientIp(): Promise<string> {
	const headerList = await headers();
	const forwardedFor = headerList.get('x-forwarded-for')?.split(',')[0]?.trim();

	return forwardedFor || headerList.get('x-real-ip')?.trim() || UNKNOWN_IP;
}

export { readClientIp };
