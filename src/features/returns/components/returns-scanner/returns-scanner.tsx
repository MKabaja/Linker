'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useBarcodeLoop } from './use-barcode-loop';
import { useCamera } from './use-camera';
import { useOcrLoop } from './use-ocr-loop';
import { type AutoMatch, useTraceSearch } from './use-trace-search';
import { useWakeLock } from './use-wake-lock';
import {
	createReturnAction,
	saveScanLogAction,
} from '@/features/returns/actions';
import type { SearchCandidate } from '@/features/returns/model/order-search.types';
import type { CreateReturnInput } from '@/features/returns/model/returns.schemas';
import type { CreateReturnResult } from '@/features/returns/model/returns.types';
import type { ScanLogInput } from '@/features/returns/model/scan-log.schemas';
import type { TraceEntry } from '@/features/returns/model/traces.types';
import {
	detectCarrier,
	isInpostReturnNumber,
} from '@/features/returns/utils/carrier';
import { normalizeCode } from '@/features/returns/utils/normalize-text';
import {
	readFromBarcode,
	readsFromManual,
} from '@/features/returns/utils/read-classifier';
import { pickScannedLabel } from '@/features/returns/utils/scanned-label';
import type { DetectedCode } from './barcode-reader';
import { returnsScannerStyles } from './returns-scanner.styles';
import { createScanDiagnostics } from './scan-diagnostics';
import { beginScan, endScan, recordScanEvent } from './scan-event-recorder';
import { buildScanFinishedEvent } from './scan-events';
import { ScannerCandidatesSheet } from './scanner-candidates-sheet';
import { ScannerControls } from './scanner-controls';
import { playHitFeedback, unlockAudio } from './scanner-feedback';
import { ScannerManualEntrySheet } from './scanner-manual-entry-sheet';
import { ScannerOverlay } from './scanner-overlay';
import { showDuplicateToast, showMatchToast } from './scanner-toast';
import { ScannerTraceList } from './scanner-trace-list';

const SAVE_TIMEOUT_MS = 15_000;
const CLOCK_TICK_MS = 500;
const MIN_ABORTED_SCAN_MS = 3_000;

type Panel = 'none' | 'manual' | 'candidates';

type Phase =
	| { kind: 'scanning' }
	| { kind: 'saving'; orderId: number }
	| { kind: 'failed'; message: string };

type MatchedBy = NonNullable<CreateReturnInput['matchedBy']>;

type SaveResult =
	| CreateReturnResult
	| { status: 'invalid' }
	| { status: 'timeout' };

type FinishScanInput = AutoMatch & { matchedBy: MatchedBy };

/**
 * Ekran skanera zwrotów: podgląd aparatu na cały ekran, odczyt kodów i OCR, szukanie zamówienia
 * i zapis zwrotu. W całym przepływie nie ma pełnego przeładowania strony, tylko `router.push`.
 */
export function ReturnsScanner() {
	const router = useRouter();
	const videoRef = useRef<HTMLVideoElement>(null);
	const isFinishingRef = useRef(false);
	const [diagnostics] = useState(() => createScanDiagnostics(Date.now()));
	const scanSession = diagnostics.scanId;
	const [phase, setPhase] = useState<Phase>({ kind: 'scanning' });
	const [panel, setPanel] = useState<Panel>('none');
	const [nowMs, setNowMs] = useState(0);
	const [isOcrUnauthorized, setIsOcrUnauthorized] = useState(false);

	const isScanning = phase.kind === 'scanning';
	const camera = useCamera({
		videoRef,
		isEnabled: isScanning,
		onRestart: diagnostics.noteCameraRestart,
		onCameraLabel: diagnostics.noteCameraLabel,
	});
	const isLoopRunning = isScanning && camera.status.kind === 'ready';
	const isPaused = panel === 'manual';

	const traceSearch = useTraceSearch({
		scanId: scanSession,
		onAutoMatch: (match) =>
			void finishScan({
				...match,
				matchedBy: diagnostics.isManualEntry() ? 'manual-entry' : 'auto',
			}),
	});
	const ocrLoop = useOcrLoop({
		videoRef,
		isEnabled: isLoopRunning,
		isPaused,
		scanSession,
		diagnostics,
		onReads: traceSearch.addReads,
		onUnauthorized: () => setIsOcrUnauthorized(true),
	});
	useBarcodeLoop({
		videoRef,
		isEnabled: isLoopRunning,
		isPaused,
		onCodes: handleCodes,
		onDetectionTime: diagnostics.noteBarcodeCall,
	});
	useWakeLock(isScanning);

	const logAbortedScan = useEffectEvent(() => {
		if (isFinishingRef.current) {
			return;
		}
		const nowMs = Date.now();
		if (nowMs - diagnostics.startedAtMs < MIN_ABORTED_SCAN_MS) {
			return;
		}
		const scanLog = diagnostics.toScanLog({
			outcome: 'aborted',
			nowMs,
			entries: traceSearch.entries,
			candidates: traceSearch.result?.candidates ?? [],
		});
		recordScanFinished(scanLog);
		void saveScanLogAction(scanLog).catch(() => undefined);
	});

	function recordScanFinished(scanLog: ScanLogInput) {
		recordScanEvent(
			scanSession,
			buildScanFinishedEvent({
				scanLog,
				view: camera.view,
				zoom: camera.zoom?.value,
				frame: camera.frameSize,
			}),
		);
	}

	useEffect(() => {
		document.addEventListener('pointerdown', unlockAudio, { once: true });
		const clock = setInterval(() => setNowMs(Date.now()), CLOCK_TICK_MS);
		beginScan(scanSession);
		recordScanEvent(scanSession, {
			type: 'scan.started',
			viewport: {
				width: window.innerWidth,
				height: window.innerHeight,
				pixelRatio: window.devicePixelRatio,
			},
		});
		return () => {
			document.removeEventListener('pointerdown', unlockAudio);
			clearInterval(clock);
			logAbortedScan();
			endScan(scanSession);
		};
	}, [scanSession]);

	function handleCodes(codes: DetectedCode[]) {
		const reads = codes.flatMap(({ value, bbox }) => {
			diagnostics.noteCarrier(detectCarrier(value));
			if (isInpostReturnNumber(normalizeCode(value))) {
				ocrLoop.noteReturnLabel(bbox);
			}
			const read = readFromBarcode(value, bbox);
			return read ? [read] : [];
		});
		traceSearch.addReads(reads);
	}

	async function finishScan({
		candidate,
		entries,
		candidates,
		matchedBy,
	}: FinishScanInput) {
		if (isFinishingRef.current) {
			return;
		}
		isFinishingRef.current = true;
		traceSearch.stop();
		playHitFeedback();
		camera.close();
		setPanel('none');
		setPhase({ kind: 'saving', orderId: candidate.orderId });
		const scanLog = diagnostics.toScanLog({
			outcome: matchedBy,
			nowMs: Date.now(),
			chosenOrderId: candidate.orderId,
			entries,
			candidates,
		});
		const candidateRank = candidates.findIndex(
			({ orderId }) => orderId === candidate.orderId,
		);
		recordScanEvent(scanSession, {
			type: 'scan.decision',
			decision: matchedBy,
			orderId: candidate.orderId,
			candidateRank: candidateRank === -1 ? undefined : candidateRank,
			bits: candidate.bits,
		});
		recordScanFinished(scanLog);
		void saveScanLogAction(scanLog).catch(() => undefined);

		const result = await saveReturn({
			orderId: candidate.orderId,
			matchedBy,
			scannedLabel: pickScannedLabel({ entries, candidate }),
		});

		if (result.status === 'created') {
			endScan(scanSession);
			showMatchToast({ entries, candidate });
			router.push(`/returns/${result.returnRecord.id}`);
			return;
		}
		if (result.status === 'duplicate') {
			recordScanEvent(scanSession, {
				type: 'scan.decision',
				decision: 'duplicate',
				orderId: candidate.orderId,
			});
			endScan(scanSession);
			showDuplicateToast({
				entries,
				candidate,
				existingReturn: result.existingReturn,
			});
			router.push(`/returns/${result.existingReturn.returnId}?duplicate=1`);
			return;
		}
		isFinishingRef.current = false;
		traceSearch.resume();
		setPhase({
			kind: 'failed',
			message: describeSaveFailure(result, candidate.orderId),
		});
	}

	function pickCandidate(candidate: SearchCandidate) {
		void finishScan({
			candidate,
			entries: traceSearch.entries,
			candidates: traceSearch.result?.candidates ?? [candidate],
			matchedBy: diagnostics.isManualEntry() ? 'manual-entry' : 'manual-pick',
		});
	}

	async function submitManualEntry(text: string): Promise<string> {
		const reads = readsFromManual(text);
		if (reads.length === 0) {
			return 'Nie rozpoznano numeru. Wpisz numer paczki, zamówienia, ID zewnętrzne albo telefon.';
		}
		diagnostics.noteManualEntry();
		const result = await traceSearch.searchReads(reads);
		if (isFinishingRef.current) {
			return '';
		}
		if (!result) {
			return 'Nie udało się wyszukać. Spróbuj ponownie.';
		}
		if (result.decision === 'candidates') {
			setPanel('candidates');
			return '';
		}
		return 'Nic nie znaleziono dla wpisanego numeru.';
	}

	function retryAfterFailure() {
		setPhase({ kind: 'scanning' });
		camera.retry();
	}

	const candidates =
		traceSearch.result?.decision === 'candidates'
			? traceSearch.result.candidates
			: [];
	const notice = describeNotice({
		phase,
		cameraErrorMessage:
			camera.status.kind === 'error' ? camera.status.message : null,
		problem: isOcrUnauthorized ? 'unauthorized' : traceSearch.problem,
	});
	const {
		root,
		video,
		centerNotice,
		glassButton,
		glassButtonBrand,
		hint,
		glassPanel,
	} = returnsScannerStyles;

	return (
		<div className={root}>
			<video ref={videoRef} className={video} playsInline muted>
				<track kind="captions" />
			</video>
			<ScannerOverlay
				entries={traceSearch.entries}
				frameSize={camera.frameSize}
				nowMs={nowMs}
			/>

			<ScannerControls
				camera={camera}
				statusText={describeStatus(
					phase,
					camera.status.kind,
					traceSearch.entries,
				)}
				isLive={isLoopRunning}
				onOpenManualEntry={() => setPanel('manual')}
			>
				{ocrLoop.hasReturnLabel && isScanning && (
					<p className={`${glassPanel} ${hint}`}>
						Etykieta zwrotna InPost. Numer paczki jest w linii „Zwrot do nadawcy
						do paczki” pod kwadratowym kodem: zbliż aparat do tej linii.
					</p>
				)}
				{candidates.length > 0 && isScanning && (
					<button
						type="button"
						className={`${glassButton} ${glassButtonBrand}`}
						onClick={() => setPanel('candidates')}
					>
						Kandydaci: {candidates.length}
					</button>
				)}
				<ScannerTraceList
					entries={traceSearch.entries}
					result={traceSearch.result}
				/>
			</ScannerControls>

			{notice && (
				<div className={centerNotice} role="alert">
					<p>{notice.message}</p>
					{notice.action === 'retry' && (
						<button
							type="button"
							className={`${glassButton} ${glassButtonBrand}`}
							onClick={
								phase.kind === 'failed' ? retryAfterFailure : camera.retry
							}
						>
							Spróbuj ponownie
						</button>
					)}
					{notice.action === 'login' && (
						<Link
							href="/login"
							className={`${glassButton} ${glassButtonBrand}`}
						>
							Zaloguj się
						</Link>
					)}
				</div>
			)}

			<ScannerManualEntrySheet
				isOpen={panel === 'manual'}
				onOpenChange={(isOpen) => setPanel(isOpen ? 'manual' : 'none')}
				onSubmit={submitManualEntry}
			/>
			<ScannerCandidatesSheet
				isOpen={panel === 'candidates'}
				candidates={candidates}
				onOpenChange={(isOpen) => setPanel(isOpen ? 'candidates' : 'none')}
				onPick={pickCandidate}
			/>
		</div>
	);
}

type NoticeAction = 'retry' | 'login' | null;

type Notice = { message: string; action: NoticeAction };

type NoticeInput = {
	phase: Phase;
	cameraErrorMessage: string | null;
	problem: 'unauthorized' | 'unavailable' | null;
};

function describeNotice({
	phase,
	cameraErrorMessage,
	problem,
}: NoticeInput): Notice | null {
	if (phase.kind === 'saving') {
		return {
			message: `Znaleziono zamówienie ${phase.orderId}. Zapisuję zwrot…`,
			action: null,
		};
	}
	if (phase.kind === 'failed') {
		return { message: phase.message, action: 'retry' };
	}
	if (problem === 'unauthorized') {
		return { message: 'Sesja wygasła. Zaloguj się ponownie.', action: 'login' };
	}
	if (cameraErrorMessage) {
		return { message: cameraErrorMessage, action: 'retry' };
	}
	return null;
}

function describeStatus(
	phase: Phase,
	cameraStatus: 'starting' | 'ready' | 'error',
	entries: TraceEntry[],
): string {
	if (phase.kind === 'saving') {
		return 'Znaleziono';
	}
	if (phase.kind === 'failed' || cameraStatus === 'error') {
		return 'Błąd';
	}
	if (cameraStatus === 'starting') {
		return 'Uruchamiam aparat…';
	}
	return entries.length > 0 ? `Tropy: ${entries.length}` : 'Skanuję';
}

function describeSaveFailure(result: SaveResult, orderId: number): string {
	if (result.status === 'notFound') {
		return `Nie znaleziono zamówienia ${orderId}.`;
	}
	if (result.status === 'error') {
		return `Znaleziono zamówienie ${orderId}, ale nie udało się dodać zwrotu: ${result.message}`;
	}
	if (result.status === 'timeout') {
		return 'Brak odpowiedzi serwera. Sprawdź połączenie i spróbuj ponownie.';
	}
	return 'Nie udało się zapisać zwrotu (nieprawidłowe dane).';
}

async function saveReturn(input: CreateReturnInput): Promise<SaveResult> {
	const timeout = new Promise<SaveResult>((resolve) =>
		setTimeout(() => resolve({ status: 'timeout' }), SAVE_TIMEOUT_MS),
	);
	try {
		return await Promise.race([createReturnAction(input), timeout]);
	} catch {
		return { status: 'timeout' };
	}
}
