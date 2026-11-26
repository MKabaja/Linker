import type {
	DetectedBarcode,
	BarcodeDetector as PonyfillDetector,
} from 'barcode-detector/ponyfill';
import type { DetectedCode } from './barcode-reader';
import type { WorkerReply } from './worker-client';

const FORMATS = [
	'code_128',
	'code_39',
	'data_matrix',
	'qr_code',
	'aztec',
] as const;
const SUPPORTED_FORMATS_TIMEOUT_MS = 2_000;
const WASM_URL = new URL('zxing-wasm/reader/zxing_reader.wasm', import.meta.url)
	.href;

type DetectorConstructor = typeof PonyfillDetector;
type Detector = InstanceType<DetectorConstructor>;
type DetectRequest = { id: number; type: 'detect'; bitmap: ImageBitmap };

let detectorPromise: Promise<Detector> | null = null;

self.onmessage = async ({ data }: MessageEvent<DetectRequest>) => {
	try {
		detectorPromise ??= createDetector();
		const detector = await detectorPromise;
		const barcodes = await detector.detect(data.bitmap);
		reply({ id: data.id, ok: true, value: barcodes.flatMap(toDetectedCode) });
	} catch (error) {
		detectorPromise = null;
		reply({
			id: data.id,
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		});
	} finally {
		data.bitmap.close();
	}
};

function reply(message: WorkerReply): void {
	self.postMessage(message);
}

async function createDetector(): Promise<Detector> {
	const native: DetectorConstructor | undefined = Reflect.get(
		globalThis,
		'BarcodeDetector',
	);
	if (native && (await supportsAllFormats(native))) {
		return new native({ formats: [...FORMATS] });
	}
	const { BarcodeDetector, prepareZXingModule } = await import(
		'barcode-detector/ponyfill'
	);
	await prepareZXingModule({
		overrides: {
			locateFile: (path: string, prefix: string) =>
				path.endsWith('.wasm') ? WASM_URL : prefix + path,
		},
		fireImmediately: true,
	});
	return new BarcodeDetector({ formats: [...FORMATS] });
}

async function supportsAllFormats(native: DetectorConstructor) {
	const timeout = new Promise<readonly string[]>((resolve) =>
		setTimeout(() => resolve([]), SUPPORTED_FORMATS_TIMEOUT_MS),
	);
	const supported: readonly string[] = await Promise.race([
		native.getSupportedFormats(),
		timeout,
	]).catch(() => []);
	return FORMATS.every((format) => supported.includes(format));
}

function toDetectedCode(barcode: DetectedBarcode): DetectedCode[] {
	const value = barcode.rawValue.trim();
	if (!value) {
		return [];
	}
	const xs = barcode.cornerPoints.map((point) => point.x);
	const ys = barcode.cornerPoints.map((point) => point.y);
	if (xs.length === 0) {
		return [{ value, bbox: undefined }];
	}
	const x = Math.min(...xs);
	const y = Math.min(...ys);
	return [
		{
			value,
			bbox: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y },
		},
	];
}
