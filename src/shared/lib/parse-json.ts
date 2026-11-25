/**
 * Parsuje JSON bez rzucania. Niepoprawny tekst daje `null`, a wynik i tak trzeba zwalidować schematem.
 */
export function parseJsonOrNull(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
