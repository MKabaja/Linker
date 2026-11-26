import { z } from 'zod';

const MAX_EVENTS_PER_BATCH = 500;
const MAX_CLIENT_TIMESTAMP_MS = 4_102_444_800_000;
const MAX_DURATION_MS = 3_600_000;

const shortText = z.string().max(80);
const rawText = z.string().max(300);
const counter = z.number().int().min(0).max(1_000_000);
const durationMs = z.number().min(0).max(MAX_DURATION_MS);

const traceKindSchema = z.enum([
	'package',
	'orderId',
	'externalId',
	'phone',
	'name',
	'postcode',
]);
const traceSourceSchema = z.enum([
	'code',
	'rapid',
	'tess-digits',
	'tess-general',
	'manual',
]);
const traceStateSchema = z.enum([
	'reading',
	'checked-none',
	'candidates',
	'hit',
]);

function clientEvent<Shape extends z.ZodRawShape>(shape: Shape) {
	return z.object({
		scanId: z.uuid(),
		clientAt: z.number().int().min(0).max(MAX_CLIENT_TIMESTAMP_MS),
		...shape,
	});
}

const clientEventSchema = z.discriminatedUnion('type', [
	clientEvent({
		type: z.literal('scan.started'),
		viewport: z.object({
			width: counter,
			height: counter,
			pixelRatio: z.number().min(0).max(20),
		}),
	}),
	clientEvent({
		type: z.literal('scan.finished'),
		outcome: z.enum([
			'auto',
			'manual-pick',
			'manual-entry',
			'not-found',
			'aborted',
		]),
		durationMs,
		chosenOrderId: z.number().int().positive().optional(),
		view: z.enum(['near', 'wide']).optional(),
		zoom: z.number().min(0).max(100).optional(),
		frame: z.object({ width: counter, height: counter }).optional(),
		cameraLabel: z.string().max(200).optional(),
		cameraRestarts: counter,
		traceCount: counter,
		ocrFrames: counter,
		ocrAvgMs: durationMs,
		ocrErrors: counter,
		ocrRejected: counter,
		gateChecks: counter,
		gatePassed: counter,
		barcodeCalls: counter,
	}),
	clientEvent({
		type: z.literal('scan.read'),
		kind: traceKindSchema,
		source: traceSourceSchema,
		pattern: shortText,
		text: rawText.optional(),
	}),
	clientEvent({
		type: z.literal('scan.trace-rejected'),
		kind: traceKindSchema,
		source: traceSourceSchema,
		pattern: shortText,
		reason: z.enum(['shop']),
		text: rawText.optional(),
	}),
	clientEvent({
		type: z.literal('scan.trace-state'),
		traceId: z.string().max(40),
		kind: traceKindSchema,
		pattern: shortText,
		state: traceStateSchema,
		version: counter,
	}),
	clientEvent({
		type: z.literal('scan.decision'),
		decision: z.enum(['auto', 'manual-pick', 'manual-entry', 'duplicate']),
		orderId: z.number().int().positive(),
		candidateRank: counter.optional(),
		bits: z.number().min(-1000).max(1000).optional(),
	}),
]);

const clientEventBatchSchema = z.object({
	events: z.array(clientEventSchema).max(MAX_EVENTS_PER_BATCH),
});

type ClientEvent = z.output<typeof clientEventSchema>;
type ClientEventBatch = z.input<typeof clientEventBatchSchema>;

export {
	type ClientEvent,
	type ClientEventBatch,
	clientEventBatchSchema,
	clientEventSchema,
	MAX_EVENTS_PER_BATCH,
};
