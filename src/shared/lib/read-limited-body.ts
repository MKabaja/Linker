type LimitedBody =
	| { status: 'ok'; body: Buffer }
	| { status: 'empty' }
	| { status: 'too-large' };

/**
 * Czyta ciało żądania strumieniowo i przerywa odczyt po przekroczeniu `maxBytes`.
 *
 * @remarks Nie ufa nagłówkowi `Content-Length`: limit liczy z faktycznie odebranych bajtów.
 */
export async function readLimitedBody(
	request: Request,
	maxBytes: number,
): Promise<LimitedBody> {
	if (!request.body) {
		return { status: 'empty' };
	}
	const chunks: Uint8Array[] = [];
	let byteCount = 0;
	const reader = request.body.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		byteCount += value.byteLength;
		if (byteCount > maxBytes) {
			await reader.cancel();
			return { status: 'too-large' };
		}
		chunks.push(value);
	}
	if (byteCount === 0) {
		return { status: 'empty' };
	}
	return { status: 'ok', body: Buffer.concat(chunks) };
}
