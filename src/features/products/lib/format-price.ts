const priceWithCurrencyFormat = new Intl.NumberFormat('pl-PL', {
	style: 'currency',
	currency: 'PLN',
});

const priceAmountFormat = new Intl.NumberFormat('pl-PL', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
	useGrouping: false,
});

export function formatPriceWithCurrency(price: number): string {
	return priceWithCurrencyFormat.format(price);
}

export function formatPriceAmount(price: number): string {
	return priceAmountFormat.format(price);
}
