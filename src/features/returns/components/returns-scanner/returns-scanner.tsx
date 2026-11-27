'use client';

import { cn } from 'cn';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useIsCoarsePointer } from '@/shared/hooks/use-is-coarse-pointer';
import { useWakeLock } from '@/shared/hooks/use-wake-lock';
import { useBarcodeLoop } from './use-barcode-loop';
import { useCamera } from './use-camera';
import { useOcrLoop } from './use-ocr-loop';
import { useTapTarget } from './use-tap-target';
import { type AutoMatch, useTraceSearch } from './use-trace-search';
import {
	createReturnAction,
	saveScanLogAction,
	searchTypedNumberAction,
} from '@/features/returns/actions';
import type { SearchCandidate } from '@/features/returns/model/order-search.types';
import type { CreateReturnInput } from '@/features/returns/model/returns.schemas';
import type { CreateReturnResult } from '@/features/returns/model/returns.types';
import type { ScanLogInput } from '@/features/returns/model/scan-log.schemas';
import type { TraceEntry } from '@/features/returns/model/traces.types';
import type {
	PendingReturnView,
	TypedNumberCandidate,
	TypedNumberSearchResult,
} from '@/features/returns/model/typed-number.types';
import { decideCameraStart } from '@/features/returns/utils/camera-start';
import {
	type Carrier,
	detectCarrier,
	isInpostReturnNumber,
} from '@/features/returns/utils/carrier';
import { normalizeCode } from '@/features/returns/utils/normalize-text';
import { MIN_SUFFIX_LENGTH } from '@/features/returns/utils/package-suffix-search';
import {
	readFromBarcode,
	readsFromManual,
} from '@/features/returns/utils/read-classifier';
import { pickScannedLabel } from '@/features/returns/utils/scanned-label';
import type { DetectedCode } from './barcode-reader';
import { toManualCandidate } from './manual-candidate';
import { returnsScannerStyles } from './returns-scanner.styles';
import { createScanDiagnostics } from './scan-diagnostics';
import { beginScan, endScan, recordScanEvent } from './scan-event-recorder';
import { buildScanFinishedEvent } from './scan-events';
import { ScannerCandidatesSheet } from './scanner-candidates-sheet';
import { ScannerControls } from './scanner-controls';
import { playHitFeedback, unlockAudio } from './scanner-feedback';
import { ScannerManualEntrySheet } from './scanner-manual-entry-sheet';
import { ScannerOverlay } from './scanner-overlay';
import { ScannerPendingReturnsSheet } from './scanner-pending-returns-sheet';
import { ScannerStartScreen } from './scanner-start-screen';
import { showDuplicateToast, showMatchToast } from './scanner-toast';
import { ScannerTraceList } from './scanner-trace-list';
import { ScannerTypedCandidatesSheet } from './scanner-typed-candidates-sheet';

const SAVE_TIMEOUT_MS = 15_000;
const CLOCK_TICK_MS = 500;
const MIN_ABORTED_SCAN_MS = 3_000;

type Panel = 'none' | 'manual' | 'candidates' | 'typed' | 'pending';

type TypedSearch = { suffix: string; candidates: TypedNumberCandidate[] };

type TypedSearchOutcome =
	| { status: 'found'; search: TypedSearch }
	| { status: 'failed'; message: string };

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
	const [detectedCarrier, setDetectedCarrier] = useState<Carrier | null>(null);
	const [typedSearch, setTypedSearch] = useState<TypedSearch>({
		suffix: '',
		candidates: [],
	});
	const [nowMs, setNowMs] = useState(0);
	const [isOcrUnauthorized, setIsOcrUnauthorized] = useState(false);
	const [isStartRequested, setIsStartRequested] = useState(false);
	const isCoarsePointer = useIsCoarsePointer();
	const cameraStart = decideCameraStart({ isCoarsePointer, isStartRequested });
	const isCameraAllowed = cameraStart === 'allowed';

	const isScanning = phase.kind === 'scanning';
	const camera = useCamera({
		videoRef,
		isEnabled: isScanning && isCameraAllowed,
		onRestart: diagnostics.noteCameraRestart,
		onCameraLabel: diagnostics.noteCameraLabel,
	});
	const isLoopRunning = isScanning && camera.status.kind === 'ready';
	const isPaused = panel !== 'none' && panel !== 'candidates';

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
	const tapTarget = useTapTarget({
		onAim: (target) => {
			ocrLoop.aimAt(target);
			camera.focusAt(target.point);
		},
	});
	useBarcodeLoop({
		videoRef,
		isEnabled: isLoopRunning,
		isPaused,
		onCodes: handleCodes,
		onDetectionTime: diagnostics.noteBarcodeCall,
	});
	useWakeLock(true, {
		onIssue: (issue) =>
			recordScanEvent(scanSession, { type: 'scan.wake-lock', issue }),
	});

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
		const reads = tapTarget.preferAimed(codes).flatMap(({ value, bbox }) => {
			const carrier = detectCarrier(value);
			diagnostics.noteCarrier(carrier);
			if (carrier) {
				setDetectedCarrier(carrier);
			}
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

	function pickTypedCandidate(candidate: TypedNumberCandidate) {
		const manualCandidate = toManualCandidate(candidate);
		void finishScan({
			candidate: manualCandidate,
			entries: traceSearch.entries,
			candidates: [manualCandidate],
			matchedBy: 'manual-entry',
		});
	}

	function pickPendingReturn(pendingReturn: PendingReturnView) {
		const manualCandidate = toManualCandidate({
			orderId: pendingReturn.orderId,
			existingReturn: null,
		});
		void finishScan({
			candidate: manualCandidate,
			entries: traceSearch.entries,
			candidates: [manualCandidate],
			matchedBy: 'manual-pick',
		});
	}

	async function submitManualEntry(text: string): Promise<string> {
		diagnostics.noteManualEntry();
		const reads = readsFromManual(text);
		if (reads.length > 0) {
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
		}
		const outcome = await searchTypedSuffix(text);
		if (isFinishingRef.current) {
			return '';
		}
		if (outcome.status === 'failed') {
			return outcome.message;
		}
		setTypedSearch(outcome.search);
		setPanel('typed');
		return '';
	}

	async function searchTypedSuffix(text: string): Promise<TypedSearchOutcome> {
		const suffix = normalizeCode(text);
		if (suffix.length < MIN_SUFFIX_LENGTH) {
			return {
				status: 'failed',
				message:
					'Nie rozpoznano numeru. Wpisz co najmniej 4 ostatnie znaki numeru paczki, kod zwrotu, numer zamówienia, ID zewnętrzne albo telefon.',
			};
		}
		const result = await requestTypedNumber({
			text,
			carrier: detectedCarrier ?? undefined,
			traces: traceSearch.entries.map(({ query }) => query),
		});
		if (result.status !== 'ok') {
			return {
				status: 'failed',
				message: 'Nie udało się wyszukać. Spróbuj ponownie.',
			};
		}
		if (result.candidates.length === 0) {
			return {
				status: 'failed',
				message:
					'Nic nie znaleziono dla wpisanego numeru. Spróbuj z listy oczekujących zwrotów.',
			};
		}
		return {
			status: 'found',
			search: { suffix, candidates: result.candidates },
		};
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
	const { root, video, centerNotice, glassButton, glassButtonAccent } =
		returnsScannerStyles;

	if (cameraStart === 'unknown') {
		return <div className={root} />;
	}

	return (
		<div className={root}>
			<video
				ref={videoRef}
				className={video}
				playsInline
				muted
				onPointerDown={tapTarget.aimFromPointer}
			>
				<track kind="captions" />
			</video>
			<ScannerOverlay
				entries={traceSearch.entries}
				frameSize={camera.frameSize}
				nowMs={nowMs}
				target={tapTarget.target}
			/>

			{cameraStart === 'waiting' && (
				<ScannerStartScreen
					onStart={() => setIsStartRequested(true)}
					onOpenManualEntry={() => setPanel('manual')}
				/>
			)}
			{isCameraAllowed && (
				<>
					<ScannerControls
						camera={camera}
						statusText={describeStatus(
							phase,
							camera.status.kind,
							traceSearch.entries,
						)}
						isLive={isLoopRunning}
						carrier={isScanning ? detectedCarrier : null}
						onOpenManualEntry={() => setPanel('manual')}
					>
						{candidates.length > 0 && isScanning && (
							<button
								type="button"
								className={cn(glassButton, glassButtonAccent)}
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
									className={cn(glassButton, glassButtonAccent)}
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
									className={cn(glassButton, glassButtonAccent)}
								>
									Zaloguj się
								</Link>
							)}
						</div>
					)}
				</>
			)}

			<ScannerManualEntrySheet
				isOpen={panel === 'manual'}
				onOpenChange={(isOpen) => setPanel(isOpen ? 'manual' : 'none')}
				onSubmit={submitManualEntry}
				onOpenPendingReturns={() => setPanel('pending')}
			/>
			<ScannerTypedCandidatesSheet
				isOpen={panel === 'typed'}
				candidates={typedSearch.candidates}
				suffix={typedSearch.suffix}
				onOpenChange={(isOpen) => setPanel(isOpen ? 'typed' : 'manual')}
				onPick={pickTypedCandidate}
			/>
			<ScannerPendingReturnsSheet
				isOpen={panel === 'pending'}
				onOpenChange={(isOpen) => setPanel(isOpen ? 'pending' : 'manual')}
				onPick={pickPendingReturn}
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

async function requestTypedNumber(
	input: Parameters<typeof searchTypedNumberAction>[0],
): Promise<TypedNumberSearchResult> {
	const timeout = new Promise<TypedNumberSearchResult>((resolve) =>
		setTimeout(() => resolve({ status: 'invalid' }), SAVE_TIMEOUT_MS),
	);
	try {
		return await Promise.race([searchTypedNumberAction(input), timeout]);
	} catch {
		return { status: 'invalid' };
	}
}
