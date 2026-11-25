/**
 * Dane konta sklepu potrzebne przy dopasowaniu: własne dane sklepu nie są tropem, a zakres `order_id`
 * i statusy wysyłki pochodzą z konta BaseLinkera.
 */
type ShopMatchingConfig = {
	/** Kod pocztowy sklepu, same cyfry (np. `32432`). Pasuje też zapis z kreską w tekście. */
	postcode: string;
	/** Słowa z adresu i nazwy sklepu. Linia, która zawiera którekolwiek z nich jako całe słowo, nie daje tropów. */
	textMarkers: readonly string[];
	/** Końcówka telefonu sklepu. Telefon z tą końcówką nie jest tropem. */
	phoneSuffix: string;
	/** Początek numerów zamówień BaseLinkera na tym koncie. */
	orderIdPrefix: string;
	orderIdLength: number;
	/** Statusy z grupy „Wysyłka”; zamówienie w jednym z nich dostaje premię w punktacji. */
	shippingStatusIds: readonly number[];
};

export type { ShopMatchingConfig };
