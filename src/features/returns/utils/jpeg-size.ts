type ImageSize = { width: number; height: number };

const JPEG_START_MARKER = [0xff, 0xd8];
const MARKER_PREFIX = 0xff;
const FIRST_FRAME_MARKER = 0xc0;
const LAST_FRAME_MARKER = 0xcf;
const NON_FRAME_MARKERS = new Set([0xc4, 0xc8, 0xcc]);

/**
 * Odczytuje wymiary JPEG z nagłówka ramki (znacznik SOFn) bez dekodowania obrazu.
 *
 * @returns `null`, gdy bajty nie są poprawnym JPEG-iem albo nagłówek jest ucięty.
 */
function readJpegSize(bytes: Uint8Array): ImageSize | null {
	if (!startsWithJpegMarker(bytes)) {
		return null;
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let offset = 2;
	while (offset + 9 < bytes.length) {
		if (bytes[offset] !== MARKER_PREFIX) {
			return null;
		}
		const marker = bytes[offset + 1];
		if (marker === MARKER_PREFIX) {
			offset += 1;
			continue;
		}
		if (isFrameMarker(marker)) {
			return {
				height: view.getUint16(offset + 5),
				width: view.getUint16(offset + 7),
			};
		}
		offset += 2 + view.getUint16(offset + 2);
	}
	return null;
}

function startsWithJpegMarker(bytes: Uint8Array): boolean {
	return (
		bytes.length >= 4 &&
		bytes[0] === JPEG_START_MARKER[0] &&
		bytes[1] === JPEG_START_MARKER[1]
	);
}

function isFrameMarker(marker: number): boolean {
	return (
		marker >= FIRST_FRAME_MARKER &&
		marker <= LAST_FRAME_MARKER &&
		!NON_FRAME_MARKERS.has(marker)
	);
}

export { type ImageSize, readJpegSize };
