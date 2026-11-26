import { getCurrentUser } from '@/features/auth/server/services/current-user.service';
import { MAX_OCR_IMAGE_BYTES } from '@/features/returns/model/ocr.constants';
import { ocrRequestHeadersSchema } from '@/features/returns/model/ocr.schemas';
import { recognizeOcrFrame } from '@/features/returns/server/ocr/ocr.service';
import { readLimitedBody } from '@/shared/lib/read-limited-body';

type OcrFailureStatus = 'busy' | 'superseded' | 'aborted' | 'invalid-image';
type ResponseByStatus = Record<OcrFailureStatus, () => Response>;

const CLIENT_CLOSED_REQUEST_STATUS = 499;

const failureResponseByStatus: ResponseByStatus = {
	busy: () =>
		Response.json(
			{ message: 'Serwer OCR zajęty.' },
			{ status: 503, headers: { 'Retry-After': '1' } },
		),
	superseded: () =>
		Response.json(
			{ message: 'Nowsza klatka z tego skanu czeka.' },
			{ status: 409 },
		),
	aborted: () => new Response(null, { status: CLIENT_CLOSED_REQUEST_STATUS }),
	'invalid-image': () =>
		Response.json({ message: 'To nie jest poprawny JPEG.' }, { status: 400 }),
};

export async function POST(request: Request): Promise<Response> {
	if (!(await getCurrentUser())) {
		return Response.json({ message: 'Zaloguj się.' }, { status: 401 });
	}

	const headers = ocrRequestHeadersSchema.safeParse({
		contentType: request.headers.get('content-type') ?? '',
		scanSession: request.headers.get('x-scan-session') ?? '',
		mode: request.headers.get('x-ocr-mode') ?? undefined,
	});
	if (!headers.success) {
		return Response.json(
			{ message: headers.error.issues[0]?.message },
			{ status: 400 },
		);
	}
	if (Number(request.headers.get('content-length')) > MAX_OCR_IMAGE_BYTES) {
		return imageTooLarge();
	}

	const body = await readLimitedBody(request, MAX_OCR_IMAGE_BYTES);
	if (body.status === 'too-large') {
		return imageTooLarge();
	}
	if (body.status === 'empty') {
		return Response.json({ message: 'Puste body.' }, { status: 400 });
	}

	const result = await recognizeOcrFrame({
		image: body.body,
		mode: headers.data.mode,
		scanSession: headers.data.scanSession,
		signal: request.signal,
	});
	if (result.status === 'done') {
		return Response.json(result.value);
	}
	return failureResponseByStatus[result.status]();
}

function imageTooLarge(): Response {
	return Response.json({ message: 'Obraz większy niż 3 MB.' }, { status: 413 });
}
