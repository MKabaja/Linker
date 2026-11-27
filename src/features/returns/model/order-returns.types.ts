type OrderReturnProduct = {
	name: string;
	ean: string;
	sku: string;
	quantity: number;
};

/**
 * Zwrot z modułu zwrotów BaseLinkera. `packageNumber` jest znormalizowany (wielkie litery, tylko `A-Z0-9`) albo `''`.
 */
type OrderReturnRecord = {
	returnId: number;
	orderId: number;
	referenceNumber: string;
	packageNumber: string;
	packageModule: string;
	source: string;
	statusId: number;
	fullName: string;
	postcode: string;
	products: OrderReturnProduct[];
	dateAdd: Date;
};

type PendingOrderReturn = Omit<OrderReturnRecord, 'packageModule' | 'statusId'>;

type OrderReturnsSyncSummary =
	| { status: 'ok'; fetchedReturns: number; pages: number }
	| { status: 'throttled' }
	| { status: 'disabled' }
	| { status: 'busy' }
	| { status: 'error'; message: string };

type PackageJournalSyncSummary =
	| { status: 'ok'; refreshedOrders: number; pages: number }
	| { status: 'throttled' }
	| { status: 'disabled' }
	| { status: 'busy' }
	| { status: 'error'; refreshedOrders: number; message: string };

export type {
	OrderReturnProduct,
	OrderReturnRecord,
	OrderReturnsSyncSummary,
	PackageJournalSyncSummary,
	PendingOrderReturn,
};
