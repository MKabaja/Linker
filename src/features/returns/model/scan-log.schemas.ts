import { z } from 'zod';

const MAX_DURATION_MILLISECONDS = 3_600_000;

const scanOutcomes = [
	'auto',
	'manual-pick',
	'manual-entry',
	'not-found',
	'aborted',
] as const;

const shortText = z.string().max(80);
const milliseconds = z.number().min(0).max(MAX_DURATION_MILLISECONDS);
const counter = z.number().int().min(0).max(1_000_000);

/**
 * Wpis dziennika skanów, jeden na skan. Bez zdjęć i danych osobowych: tropy jako wzorce
 * (to, co i tak jest zamaskowane na etykiecie, np. `7320___83`), kandydaci jako numer zamówienia i bity.
 */
const scanLogInputSchema = z.object({
	scanId: z.uuid().optional(),
	startedAt: z.iso.datetime({ offset: true }),
	durationMs: milliseconds,
	outcome: z.enum(scanOutcomes),
	chosenOrderId: z.number().int().positive().optional(),
	traces: z
		.array(
			z.object({
				display: shortText,
				kind: z.enum([
					'package',
					'orderId',
					'externalId',
					'phone',
					'name',
					'postcode',
				]),
				sources: z.array(z.string().max(40)).max(10),
				votes: z.number().int().min(0).max(10_000),
				state: z.enum(['reading', 'checked-none', 'candidates', 'hit']),
			}),
		)
		.max(60),
	topCandidates: z
		.array(
			z.object({
				orderId: z.number().int().positive(),
				bits: z.number().min(-1000).max(1000),
			}),
		)
		.max(10),
	ocr: z.object({
		frames: counter,
		avgMs: milliseconds,
		maxMs: milliseconds,
		byEngine: z.record(
			z.string().max(40),
			z.object({ count: counter, avgMs: milliseconds }),
		),
	}),
	carriers: z.array(z.string().max(40)).max(10),
	cameraLabel: z.string().max(200).optional(),
	diagnostics: z
		.object({
			ocrErrors: counter,
			cameraRestarts: counter,
			barcodeCalls: counter.optional(),
			barcodeAvgMs: milliseconds.optional(),
			captureAvgMs: milliseconds.optional(),
			ocrRejected: counter.optional(),
			gateChecks: counter.optional(),
			gatePassed: counter.optional(),
		})
		.optional(),
});

type ScanOutcome = (typeof scanOutcomes)[number];
type ScanLogInput = z.input<typeof scanLogInputSchema>;
type ScanLog = z.output<typeof scanLogInputSchema>;

export {
	type ScanLog,
	type ScanLogInput,
	type ScanOutcome,
	scanLogInputSchema,
};
