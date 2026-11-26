type WorkerReply =
	| { id: number; ok: true; value: unknown }
	| { id: number; ok: false; error: string };

type CallOptions<Value> = {
	timeoutMs: number;
	isValue: (value: unknown) => value is Value;
	transfer?: Transferable[];
};

type PendingCall = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
};

type WorkerClient = {
	call: <Value>(
		message: Record<string, unknown>,
		options: CallOptions<Value>,
	) => Promise<Value>;
	dispose: () => void;
};

/**
 * Klient wątku roboczego z limitem czasu na każde wywołanie. Zawieszony albo zepsuty wątek jest
 * zamykany, a oczekujące wywołania kończą się błędem; następne wywołanie startuje nowy wątek.
 * Po `dispose` każde wywołanie jest odrzucane od razu i nie tworzy wątku.
 * Odpowiedź przechodzi przez `isValue`, więc wywołujący dostaje typ sprawdzony w czasie działania.
 */
function createWorkerClient(spawn: () => Worker): WorkerClient {
	let worker: Worker | null = null;
	let isDisposed = false;
	let nextId = 1;
	const pendingById = new Map<number, PendingCall>();

	function failAll(message: string): void {
		for (const pending of pendingById.values()) {
			clearTimeout(pending.timer);
			pending.reject(new Error(message));
		}
		pendingById.clear();
	}

	function restart(message: string): void {
		worker?.terminate();
		worker = null;
		failAll(message);
	}

	function startWorker(): Worker {
		const created = spawn();
		created.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
			const pending = pendingById.get(data.id);
			if (!pending) {
				return;
			}
			pendingById.delete(data.id);
			clearTimeout(pending.timer);
			if (data.ok) {
				pending.resolve(data.value);
			} else {
				pending.reject(new Error(data.error));
			}
		};
		created.onerror = (event) =>
			restart(event.message || 'Błąd wątku roboczego.');
		return created;
	}

	function call<Value>(
		message: Record<string, unknown>,
		{ timeoutMs, isValue, transfer = [] }: CallOptions<Value>,
	): Promise<Value> {
		if (isDisposed) {
			return Promise.reject(new Error('Wątek roboczy zamknięty.'));
		}
		worker ??= startWorker();
		const id = nextId++;
		return new Promise<unknown>((resolve, reject) => {
			const timer = setTimeout(() => {
				pendingById.delete(id);
				reject(new Error('Wątek roboczy nie odpowiedział.'));
				restart('Limit czasu wątku roboczego.');
			}, timeoutMs);
			pendingById.set(id, { resolve, reject, timer });
			worker?.postMessage({ ...message, id }, transfer);
		}).then((value) => {
			if (!isValue(value)) {
				throw new Error('Nieoczekiwana odpowiedź wątku roboczego.');
			}
			return value;
		});
	}

	function dispose(): void {
		isDisposed = true;
		restart('Wątek roboczy zamknięty.');
	}

	return { call, dispose };
}

export { createWorkerClient, type WorkerClient, type WorkerReply };
