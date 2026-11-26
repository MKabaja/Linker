/**
 * Dane konta sklepu potrzebne przy dopasowaniu: własne dane sklepu nie są tropem, a zakres `order_id`
 * i statusy wysyłki pochodzą z konta BaseLinkera.
 */
type ShopMatchingConfig = {
	/** Kod pocztowy sklepu, same cyfry (np. `32432`). Pasuje też zapis z kreską w tekście. */
	postcode: string;
	/**
	 * Słowa z adresu i nazwy sklepu. Linia, która zawiera którekolwiek z nich, nie daje tropów: słowa od 5 znaków
	 * także sklejone z innymi lub rozstrzelone, krótsze tylko jako całe słowa.
	 */
	textMarkers: readonly string[];
	/**
	 * Końcówka telefonu sklepu. Telefon z tą końcówką nie jest tropem; maska bez innych znanych cyfr
	 * niż fragment tej końcówki (np. ucięte `…909`) też nie.
	 */
	phoneSuffix: string;
	/**
	 * Zamaskowane nazwy sklepu jako prefiksy słów (np. `[['ko'], ['ko', 'dr']]`). Maska imienia o tej samej
	 * liczbie słów, której każde słowo zaczyna się od prefiksu z tej samej pozycji, nie jest tropem.
	 */
	shopNameMasks: readonly (readonly string[])[];
	/** Początek numerów zamówień BaseLinkera na tym koncie. */
	orderIdPrefix: string;
	orderIdLength: number;
	/** Statusy z grupy „Wysyłka”; zamówienie w jednym z nich dostaje premię w punktacji. */
	shippingStatusIds: readonly number[];
};

type ReturnKind = 'full' | 'partial';

type ReturnItemCondition = 'accepted' | 'damaged';

type ReturnEventKind = 'created' | 'updated';

type ReturnedQuantities = { quantityOrdered: number; quantityReceived: number };

type ReturnItem = ReturnedQuantities & {
	id: number;
	/** `null` dla pozycji spoza zamówienia. */
	orderProductId: number | null;
	name: string;
	ean: string;
	sku: string;
	condition: ReturnItemCondition;
};

type ReturnRecord = {
	id: number;
	orderId: number;
	source: string;
	note: string;
	/** `id` jest `null` dla zwrotu z importu; `name` jest wtedy etykietą importu. */
	receivedBy: { id: number | null; name: string };
	createdAt: Date;
	updatedAt: Date;
	kind: ReturnKind;
	items: ReturnItem[];
};

/** Stan zwrotu zapisany w historii przy utworzeniu i każdej edycji. */
type ReturnSnapshot = { note: string; items: ReturnItem[] };

type ReturnEvent = {
	id: number;
	kind: ReturnEventKind;
	createdAt: Date;
	userName: string;
	snapshot: ReturnSnapshot;
};

type ReturnDetails = ReturnRecord & { events: ReturnEvent[] };

type DayReturns = {
	/** `YYYY-MM-DD` w strefie Europe/Warsaw. */
	date: string;
	returns: ReturnRecord[];
	summary: { total: number; full: number; partial: number };
};

type CreateReturnResult =
	| { status: 'created'; returnRecord: ReturnRecord }
	| {
			status: 'duplicate';
			returnRecord: ReturnRecord;
			existingReturn: DuplicateReturnWarning;
	  }
	| { status: 'notFound' }
	| { status: 'error'; message: string };

type UpdateReturnResult =
	| { status: 'updated'; returnRecord: ReturnRecord }
	| { status: 'notFound' };

type DeleteReturnResult = { status: 'deleted' } | { status: 'notFound' };

type OrderDetailsItem = {
	position: number;
	orderProductId: number | null;
	name: string;
	ean: string;
	sku: string;
	quantity: number;
};

type OrderDetailsPackage = {
	courierCode: string;
	packageNumber: string;
	innerNumber: string;
};

/**
 * Zamówienie na ekranie zwrotu, bez danych osobowych klienta.
 */
type OrderDetails = {
	orderId: number;
	externalOrderId: string;
	source: string;
	statusId: number;
	/** Nazwa z BaseLinkera, a gdy integracja jest wyłączona, sam identyfikator statusu. */
	statusName: string;
	dateAdd: Date;
	dateConfirmed: Date | null;
	items: OrderDetailsItem[];
	packages: OrderDetailsPackage[];
};

type OrderDetailsResult =
	| { status: 'found'; order: OrderDetails }
	| { status: 'notFound' }
	| { status: 'error'; message: string };

type CsvFile = { fileName: string; content: string };

/** Czym znaleziono zamówienie przy przyjęciu zwrotu; `imported` to zwrot przeniesiony z demo. */
type ReturnMatchedBy = 'auto' | 'manual-pick' | 'manual-entry' | 'imported';

/** Dane do ostrzeżenia, że zwrot dla zamówienia już przyjęto. */
type DuplicateReturnWarning = {
	returnId: number;
	orderId: number;
	receivedAt: Date;
	/** `DD.MM.RRRR, GG:MM` w strefie Europe/Warsaw. */
	receivedAtLabel: string;
	/** Imię pracownika albo etykieta importu. */
	receivedByName: string;
	kind: ReturnKind;
	/** `Pełny` albo `Częściowy`. */
	kindLabel: string;
};

export type {
	CreateReturnResult,
	CsvFile,
	DayReturns,
	DeleteReturnResult,
	DuplicateReturnWarning,
	OrderDetails,
	OrderDetailsItem,
	OrderDetailsPackage,
	OrderDetailsResult,
	ReturnDetails,
	ReturnEvent,
	ReturnEventKind,
	ReturnedQuantities,
	ReturnItem,
	ReturnItemCondition,
	ReturnKind,
	ReturnMatchedBy,
	ReturnRecord,
	ReturnSnapshot,
	ShopMatchingConfig,
	UpdateReturnResult,
};
