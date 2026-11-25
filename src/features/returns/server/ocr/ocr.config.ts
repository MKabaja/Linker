import 'server-only';
import path from 'node:path';

const RAPID_OCR_SERVICE_URL =
	process.env.OCR_SERVICE_URL ?? 'http://127.0.0.1:3201';
const RAPID_OCR_TIMEOUT_MS = 8_000;
const RAPID_OCR_RETRY_AFTER_MS = 15_000;

const TESSERACT_POOL_SIZE = 2;
const TESSERACT_LANG_PATH = path.join(
	process.cwd(),
	'node_modules',
	'@tesseract.js-data',
	'eng',
	'4.0.0_best_int',
);
const TESSERACT_WORKER_PATH = path.join(
	process.cwd(),
	'node_modules',
	'tesseract.js',
	'src',
	'worker-script',
	'node',
	'index.js',
);

const OCR_QUEUE_MAX_RUNNING = 2;
const OCR_QUEUE_MAX_WAITING = 4;

export {
	OCR_QUEUE_MAX_RUNNING,
	OCR_QUEUE_MAX_WAITING,
	RAPID_OCR_RETRY_AFTER_MS,
	RAPID_OCR_SERVICE_URL,
	RAPID_OCR_TIMEOUT_MS,
	TESSERACT_LANG_PATH,
	TESSERACT_POOL_SIZE,
	TESSERACT_WORKER_PATH,
};
