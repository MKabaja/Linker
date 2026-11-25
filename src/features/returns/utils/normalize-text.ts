const PHONE_DIGITS = 9;

type FullName = { firstName: string; lastName: string };

function normalizeCode(value: string): string {
	return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function foldPolishText(value: string): string {
	return value
		.toLowerCase()
		.replace(/ł/g, 'l')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '');
}

function normalizeText(value: string): string {
	return foldPolishText(value)
		.replace(/[^a-z0-9 ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Dzieli imię i nazwisko: imię to pierwsze słowo, nazwisko ostatnie.
 * Gdy `deliveryFullname` jest pusty, używa `invoiceFullname`. Brak słów daje puste pola.
 */
function splitFullName(
	deliveryFullname: string,
	invoiceFullname: string,
): FullName {
	const fullName =
		normalizeText(deliveryFullname) || normalizeText(invoiceFullname);
	const words = fullName.split(' ').filter(Boolean);
	if (words.length === 0) {
		return { firstName: '', lastName: '' };
	}
	return {
		firstName: words[0],
		lastName: words.length > 1 ? words[words.length - 1] : '',
	};
}

function normalizePhone(value: string): string {
	return value.replace(/\D/g, '').slice(-PHONE_DIGITS);
}

function normalizePostcode(value: string): string {
	return value.replace(/\D/g, '');
}

export {
	type FullName,
	foldPolishText,
	normalizeCode,
	normalizePhone,
	normalizePostcode,
	normalizeText,
	splitFullName,
};
