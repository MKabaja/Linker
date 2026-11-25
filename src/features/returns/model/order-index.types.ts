/**
 * Zamówienie w indeksie w bazie. Tylko pola potrzebne do dopasowania i ekranu zwrotu,
 * dane osobowe wyłącznie znormalizowane (bez adresu, e-maila i pełnego imienia i nazwiska).
 */
type IndexedOrderRecord = {
	orderId: number;
	externalOrderId: string;
	source: string;
	sourceId: number;
	statusId: number;
	dateAdd: Date;
	/** `null` dla zamówienia niepotwierdzonego. */
	dateConfirmed: Date | null;
	firstNameNormalized: string;
	lastNameNormalized: string;
	/** Ostatnie 9 cyfr albo `''`. */
	phoneDigits: string;
	/** Same cyfry. */
	postcode: string;
	cityNormalized: string;
};

type IndexedOrderItem = {
	position: number;
	orderProductId: number | null;
	productId: string;
	name: string;
	ean: string;
	sku: string;
	quantity: number;
};

/**
 * Przesyłka zamówienia. Numery znormalizowane: wielkie litery, tylko `A-Z0-9`.
 */
type IndexedPackage = {
	packageNumber: string;
	innerNumber: string;
	courierCode: string;
};

type OrderIndexEntry = {
	order: IndexedOrderRecord;
	items: IndexedOrderItem[];
	packages: IndexedPackage[];
};

/**
 * Wynik odczytu z zewnętrznego systemu zamówień. `disabled`, gdy integracja nie jest skonfigurowana.
 */
type RemoteResult<T> =
	| { status: 'ok'; data: T }
	| { status: 'disabled' }
	| { status: 'error'; code: string; message: string };

type SyncSummary =
	| {
			status: 'ok';
			fetchedOrders: number;
			pages: number;
			removedOrders: number;
			pendingPackages: number;
	  }
	| { status: 'disabled' }
	| { status: 'busy' }
	| { status: 'error'; message: string };

type PackagesSyncSummary =
	| { status: 'ok'; checkedOrders: number; pendingPackages: number }
	| { status: 'disabled' }
	| { status: 'busy' }
	| { status: 'error'; checkedOrders: number; message: string };

export type {
	IndexedOrderItem,
	IndexedOrderRecord,
	IndexedPackage,
	OrderIndexEntry,
	PackagesSyncSummary,
	RemoteResult,
	SyncSummary,
};
