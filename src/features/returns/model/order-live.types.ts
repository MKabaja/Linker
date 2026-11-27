/**
 * Dane klienta pobrane na żywo z BaseLinkera. Nie trafiają do bazy. Brakujące pole to `''`.
 */
type OrderCustomer = {
	/** Imię i nazwisko odbiorcy, a gdy go brak, firma. */
	name: string;
	login: string;
	phone: string;
	email: string;
	/** Adres dostawy albo punkt odbioru (z prefiksem `Punkt odbioru:`). */
	deliveryAddress: string;
	deliveryMethod: string;
	paymentMethod: string;
};

type PickPackEvent = { actionType: number; profileName: string; at: Date };

type TrackingEvent = { status: number; at: Date };

type OrderPacking = { packerName: string; packedAt: Date };

type ShipmentDate = {
	/** `shipped`: przesyłka nadana lub dalej; `labelCreated`: znamy tylko pierwszą datę przesyłki. */
	kind: 'shipped' | 'labelCreated';
	at: Date;
};

type OrderShipping = {
	packageCount: number;
	/** `null`, gdy pakowanie odbyło się poza modułem BaseLinkera. */
	packing: OrderPacking | null;
	shipmentDate: ShipmentDate | null;
};

type OrderLiveDetails = { customer: OrderCustomer; shipping: OrderShipping };

type OrderLiveDetailsResult =
	| { status: 'ok'; details: OrderLiveDetails }
	| { status: 'disabled' }
	| { status: 'error'; message: string };

export type {
	OrderCustomer,
	OrderLiveDetails,
	OrderLiveDetailsResult,
	OrderPacking,
	OrderShipping,
	PickPackEvent,
	ShipmentDate,
	TrackingEvent,
};
