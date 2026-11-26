import 'server-only';
import type { ZodType } from 'zod';
import type { RemoteResult } from '@/features/returns/model/order-index.types';
import { getProcessSingleton } from '@/shared/lib/process-singleton';
import {
	BASELINKER_ENDPOINT,
	BASELINKER_TIMEOUT_MILLISECONDS,
	getBaseLinkerConfig,
} from './baselinker.config';
import {
	type BaseLinkerOrder,
	type BaseLinkerOrderStatus,
	type BaseLinkerPackage,
	getOrderPackagesResponseSchema,
	getOrderStatusListResponseSchema,
	getOrdersResponseSchema,
} from './baselinker.schemas';
import {
	type CallPriority,
	countInteractiveStreak,
	decideNextCall,
	type SchedulerState,
} from './call-scheduler';

const READ_ONLY_METHOD_PATTERN = /^get[A-Z]\w*$/;

type ReadOnlyMethod = `get${string}`;

type BaseLinkerParameters = Record<string, string | number | boolean>;

type BaseLinkerResult<T> = RemoteResult<T>;

type BaseLinkerFailure = Exclude<BaseLinkerResult<never>, { status: 'ok' }>;

type OrdersQuery =
	| { date_confirmed_from: number; get_unconfirmed_orders: false }
	| { order_id: number; get_unconfirmed_orders: true }
	| { filter_external_order_id: string; get_unconfirmed_orders: true };

type CallOptions = { priority?: CallPriority };

type EnqueueOptions = {
	pauseMilliseconds: number;
	priority: CallPriority;
};

type QueuedTask = () => Promise<void>;

type CallQueue = {
	interactive: QueuedTask[];
	background: QueuedTask[];
	interactiveStreak: number;
	lastCallAt: number;
	isPumping: boolean;
};

type ReadOnlyCall<T> = {
	method: ReadOnlyMethod;
	parameters: BaseLinkerParameters;
	schema: ZodType<T>;
	priority: CallPriority;
};

type SendRequest = {
	token: string;
	method: ReadOnlyMethod;
	parameters: BaseLinkerParameters;
};

const callQueue = getProcessSingleton<CallQueue>(
	'returns.baselinker-queue',
	() => ({
		interactive: [],
		background: [],
		interactiveStreak: 0,
		lastCallAt: 0,
		isPumping: false,
	}),
);

/**
 * Pobiera stronę zamówień (najwyżej 100) z `getOrders`.
 *
 * @remarks
 * Wszystkie funkcje tego modułu idą przez jedną kolejkę procesu z pauzą `BASELINKER_PAUSE_MS` między każdymi dwoma wywołaniami; bez tokenu zwracają `disabled`.
 * `options.priority` (domyślnie `interactive`) wybiera pierwszeństwo w kolejce; synchronizacja podaje `background`, więc wywołania użytkownika jej nie czekają (reguła w `decideNextCall`).
 */
async function fetchBaseLinkerOrders(
	query: OrdersQuery,
	options: CallOptions = {},
): Promise<BaseLinkerResult<BaseLinkerOrder[]>> {
	const result = await callReadOnlyMethod({
		method: 'getOrders',
		parameters: query,
		schema: getOrdersResponseSchema,
		priority: options.priority ?? 'interactive',
	});

	return result.status === 'ok'
		? { status: 'ok', data: result.data.orders }
		: result;
}

async function fetchBaseLinkerOrderPackages(
	orderId: number,
	options: CallOptions = {},
): Promise<BaseLinkerResult<BaseLinkerPackage[]>> {
	const result = await callReadOnlyMethod({
		method: 'getOrderPackages',
		parameters: { order_id: orderId },
		schema: getOrderPackagesResponseSchema,
		priority: options.priority ?? 'interactive',
	});

	return result.status === 'ok'
		? { status: 'ok', data: result.data.packages }
		: result;
}

async function fetchBaseLinkerOrderStatuses(
	options: CallOptions = {},
): Promise<BaseLinkerResult<BaseLinkerOrderStatus[]>> {
	const result = await callReadOnlyMethod({
		method: 'getOrderStatusList',
		parameters: {},
		schema: getOrderStatusListResponseSchema,
		priority: options.priority ?? 'interactive',
	});

	return result.status === 'ok'
		? { status: 'ok', data: result.data.statuses }
		: result;
}

function callReadOnlyMethod<T>({
	method,
	parameters,
	schema,
	priority,
}: ReadOnlyCall<T>): Promise<BaseLinkerResult<T>> {
	if (!READ_ONLY_METHOD_PATTERN.test(method)) {
		return Promise.resolve({
			status: 'error',
			code: 'METHOD_BLOCKED',
			message: `Metoda ${method} jest zablokowana (dozwolone tylko get*).`,
		});
	}

	const { token, pauseMilliseconds } = getBaseLinkerConfig();

	if (!token) {
		return Promise.resolve({ status: 'disabled' });
	}

	return enqueue({ pauseMilliseconds, priority }, async () => {
		const response = await send({ token, method, parameters });

		if (response.status !== 'ok') {
			return response;
		}

		const parsedBody = schema.safeParse(response.data);

		return parsedBody.success
			? { status: 'ok', data: parsedBody.data }
			: {
					status: 'error',
					code: 'UNEXPECTED_RESPONSE',
					message: `Nieoczekiwany kształt odpowiedzi ${method}.`,
				};
	});
}

function enqueue<T>(
	{ pauseMilliseconds, priority }: EnqueueOptions,
	task: () => Promise<T>,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		callQueue[priority].push(async () => {
			try {
				resolve(await task());
			} catch (error) {
				reject(error);
			}
		});

		void pumpQueue(pauseMilliseconds);
	});
}

async function pumpQueue(pauseMilliseconds: number): Promise<void> {
	if (callQueue.isPumping) {
		return;
	}

	callQueue.isPumping = true;

	try {
		while (true) {
			const decision = decideNextCall({
				state: toSchedulerState(callQueue),
				now: Date.now(),
				pauseMilliseconds,
			});

			if (decision.action === 'idle') {
				return;
			}

			if (decision.action === 'wait') {
				await new Promise((resolve) =>
					setTimeout(resolve, decision.milliseconds),
				);
				continue;
			}

			const runTask = callQueue[decision.priority].shift();

			callQueue.interactiveStreak = countInteractiveStreak(
				callQueue.interactiveStreak,
				decision.priority,
			);
			callQueue.lastCallAt = Date.now();
			await runTask?.();
		}
	} finally {
		callQueue.isPumping = false;
	}
}

function toSchedulerState(queue: CallQueue): SchedulerState {
	return {
		interactiveWaiting: queue.interactive.length,
		backgroundWaiting: queue.background.length,
		interactiveStreak: queue.interactiveStreak,
		lastCallAt: queue.lastCallAt,
	};
}

async function send({
	token,
	method,
	parameters,
}: SendRequest): Promise<BaseLinkerResult<unknown>> {
	try {
		const response = await fetch(BASELINKER_ENDPOINT, {
			method: 'POST',
			headers: {
				'X-BLToken': token,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				method,
				parameters: JSON.stringify(parameters),
			}),
			signal: AbortSignal.timeout(BASELINKER_TIMEOUT_MILLISECONDS),
			cache: 'no-store',
		});
		const body: unknown = await response.json();

		return readResponseBody(body);
	} catch (error) {
		return toNetworkFailure(error);
	}
}

function readResponseBody(body: unknown): BaseLinkerResult<unknown> {
	if (typeof body !== 'object' || body === null || !('status' in body)) {
		return {
			status: 'error',
			code: 'BAD_RESPONSE',
			message: 'Nieczytelna odpowiedź API BaseLinkera.',
		};
	}

	if (body.status === 'SUCCESS') {
		return { status: 'ok', data: body };
	}

	return {
		status: 'error',
		code: 'error_code' in body ? String(body.error_code) : 'ERROR',
		message:
			'error_message' in body
				? String(body.error_message)
				: 'Błąd API BaseLinkera.',
	};
}

function toNetworkFailure(error: unknown): BaseLinkerFailure {
	const isTimeout = error instanceof Error && error.name === 'TimeoutError';

	return {
		status: 'error',
		code: isTimeout ? 'TIMEOUT' : 'NETWORK',
		message: isTimeout
			? 'BaseLinker nie odpowiedział na czas.'
			: 'Brak połączenia z BaseLinkerem.',
	};
}

export {
	type BaseLinkerFailure,
	type BaseLinkerResult,
	type CallOptions,
	fetchBaseLinkerOrderPackages,
	fetchBaseLinkerOrderStatuses,
	fetchBaseLinkerOrders,
	type OrdersQuery,
};
