import 'server-only';

const registryKey: unique symbol = Symbol.for('linker.process-singletons');

type SingletonRegistry = Map<string, unknown>;

type GlobalWithRegistry = typeof globalThis & {
	[registryKey]?: SingletonRegistry;
};

/**
 * Zwraca obiekt wspólny dla całego procesu Node, tworząc go przy pierwszym wywołaniu.
 *
 * @remarks
 * Next może załadować ten sam moduł osobno dla stron, akcji i Route Handlerów (oraz po HMR),
 * więc zwykła zmienna modułu nie daje jednej instancji. Rejestr żyje na `globalThis`.
 * Ten sam `key` musi zawsze oznaczać ten sam typ.
 */
export function getProcessSingleton<T>(key: string, create: () => T): T {
	const globalWithRegistry: GlobalWithRegistry = globalThis;
	globalWithRegistry[registryKey] ??= new Map();
	const registry = globalWithRegistry[registryKey];

	if (!registry.has(key)) {
		registry.set(key, create());
	}

	return registry.get(key) as T;
}
