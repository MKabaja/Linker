import { createFrameGate } from './frame-gate';
import type { FrameRequest } from './frame-pipeline';
import type { WorkerReply } from './worker-client';

const JPEG_QUALITY = 0.75;

const gate = createFrameGate();
let gateCanvas: OffscreenCanvas | null = null;

self.onmessage = async ({ data }: MessageEvent<FrameRequest>) => {
	try {
		reply({ id: data.id, ok: true, value: await handle(data) });
	} catch (error) {
		reply({
			id: data.id,
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		});
	} finally {
		if (data.type !== 'reset') {
			data.bitmap.close();
		}
	}
};

function reply(message: WorkerReply): void {
	self.postMessage(message);
}

async function handle(request: FrameRequest): Promise<unknown> {
	if (request.type === 'reset') {
		gate.reset();
		return true;
	}
	if (request.type === 'gate') {
		return measure(request.bitmap);
	}
	return encode(request.bitmap);
}

function measure(bitmap: ImageBitmap) {
	gateCanvas ??= new OffscreenCanvas(bitmap.width, bitmap.height);
	gateCanvas.width = bitmap.width;
	gateCanvas.height = bitmap.height;
	const context = gateCanvas.getContext('2d', { willReadFrequently: true });
	if (!context) {
		throw new Error('Brak kontekstu 2D.');
	}
	context.drawImage(bitmap, 0, 0);
	const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
	return gate.measure(data, bitmap.width, bitmap.height);
}

function encode(bitmap: ImageBitmap): Promise<Blob> {
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
	return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
}
