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
	 * Pełny telefon sklepu, 9 cyfr. Odczyt różniący się od niego jedną cyfrą albo z dodatkową cyfrą
	 * (np. `880729083`, `1880729093`) i maska, której znany koniec od 4 cyfr różni się od jego końca
	 * najwyżej jedną cyfrą (`***3 093`), też nie są tropem.
	 */
	phone: string;
	/**
	 * Zamaskowane nazwy sklepu i firmy odbiorcy jako prefiksy słów (np. `[['ko'], ['ko', 'dr']]`). Maska imienia
	 * o tej samej liczbie słów, której każde słowo zaczyna się od prefiksu z tej samej pozycji, nie jest tropem.
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

type ReturnEventKind = 'created' | 'updated' | 'deleted' | 'restored';

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

/** Kto i kiedy wystawił korektę; `byName` jest `null`, gdy konto autora już nie istnieje. */
type ReturnCorrection = { at: Date; byName: string | null };

/** Kto i kiedy usunął zwrot; osoba to `IMPORTED_RECEIVER_NAME`, gdy autora nie ma. */
type ReturnDeletion = { at: Date; byName: string };

type ReturnRecord = {
	id: number;
	orderId: number;
	source: string;
	/** Numer zamówienia w WAPRO z indeksu; `''`, gdy brak zamówienia w indeksie albo numeru. */
	waproOrderNumber: string;
	/** Kod WMS z indeksu; `''`, gdy brak zamówienia w indeksie albo kodu. */
	wmsCode: string;
	note: string;
	matchedBy: ReturnMatchedBy;
	/** Numer paczki lub etykiety, który dał trafienie; `null`, gdy nie zapisano. */
	scannedLabel: string | null;
	/** `null`, gdy korekta nie została wystawiona. */
	correction: ReturnCorrection | null;
	/** `id` jest `null` dla zwrotu z importu; `name` jest wtedy etykietą importu. */
	receivedBy: { id: number | null; name: string };
	createdAt: Date;
	updatedAt: Date;
	/** `null`, gdy zwrot nie jest usunięty. */
	deletion: ReturnDeletion | null;
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

/** Sąsiednie zwroty w kolejności przyjęcia (bez usuniętych); `null` na końcu listy. */
type ReturnNeighbors = {
	previousReturnId: number | null;
	nextReturnId: number | null;
};

type DayReturns = {
	/** `YYYY-MM-DD` w strefie Europe/Warsaw. */
	date: string;
	returns: ReturnRecord[];
	summary: {
		total: number;
		full: number;
		partial: number;
		/** Zwroty dnia bez wystawionej korekty, niezależnie od filtra korekty. */
		withoutCorrection: number;
	};
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
	| { status: 'deleted' }
	| { status: 'notFound' };

type DeleteReturnResult = { status: 'deleted' } | { status: 'notFound' };

type RestoreReturnResult = { status: 'restored' } | { status: 'notFound' };

type SetReturnCorrectionResult =
	| { status: 'updated'; correction: ReturnCorrection | null }
	| { status: 'deleted' }
	| { status: 'notFound' };

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
	/** Przesyłka zwrotna, a nie wysyłkowa. */
	isReturn: boolean;
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
	/** `DD.MM.RRRR, GG:MM`; `null`, gdy zwrot nie jest usunięty. */
	deletedAtLabel: string | null;
	deletedByName: string | null;
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
	RestoreReturnResult,
	ReturnCorrection,
	ReturnDeletion,
	ReturnDetails,
	ReturnEvent,
	ReturnEventKind,
	ReturnedQuantities,
	ReturnItem,
	ReturnItemCondition,
	ReturnKind,
	ReturnMatchedBy,
	ReturnNeighbors,
	ReturnRecord,
	ReturnSnapshot,
	SetReturnCorrectionResult,
	ShopMatchingConfig,
	UpdateReturnResult,
};
