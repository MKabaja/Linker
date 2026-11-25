import { describe, expect, it } from 'vitest';
import { readJpegSize } from '@/features/returns/utils/jpeg-size';

const startOfImage = [0xff, 0xd8];
const appSegment = [0xff, 0xe0, 0x00, 0x04, 0x00, 0x00];
const frameHeader = [
	0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x05, 0x00, 0x03,
];

describe('readJpegSize', () => {
	it('czyta wymiary z nagłówka ramki za innymi segmentami', () => {
		const bytes = Uint8Array.from([
			...startOfImage,
			...appSegment,
			...frameHeader,
			0,
			0,
		]);

		expect(readJpegSize(bytes)).toEqual({ width: 1280, height: 480 });
	});

	it('zwraca null dla danych, które nie są JPEG-iem', () => {
		expect(
			readJpegSize(new TextEncoder().encode('not a jpeg image')),
		).toBeNull();
	});

	it('zwraca null dla uciętego nagłówka', () => {
		expect(
			readJpegSize(Uint8Array.from([...startOfImage, ...appSegment])),
		).toBeNull();
	});
});
