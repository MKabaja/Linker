import { describe, expect, it } from 'vitest';
import {
	detectCarrier,
	detectCarrierFromText,
	extractDpdParcelNumber,
	isInpostReturnNumber,
} from '@/features/returns/utils/carrier';
import { LABEL_CODES } from '@/features/returns/utils/fixtures.test-helper';

describe('detectCarrier', () => {
	it.each([
		[LABEL_CODES.inpostAllegroReturn, 'inpost-zwrot'],
		[LABEL_CODES.inpost[0], 'inpost'],
		[LABEL_CODES.inpost[1], 'inpost'],
		[LABEL_CODES.dpdFull[0], 'dpd'],
		[LABEL_CODES.dpdParcel[0], 'dpd'],
		[LABEL_CODES.allegroOne, 'allegro-one'],
		[LABEL_CODES.dhl[0], 'dhl'],
		[LABEL_CODES.dhl[1], 'dhl'],
		['PX1234567890', 'poczta-polska'],
		[LABEL_CODES.orlen, 'orlen'],
		['620999669102333123456789', 'inpost-zwrot'],
	])('%s → %s', (code, carrier) => {
		expect(detectCarrier(code)).toBe(carrier);
	});

	it('zwrot Allegro przez InPost (600000…) nie jest numerem zwrotnym nieznanym BaseLinkerowi', () => {
		expect(isInpostReturnNumber(LABEL_CODES.inpostAllegroReturn)).toBe(false);
	});
});

describe('extractDpdParcelNumber', () => {
	it('z pełnego kodu DPD bierze numer paczki', () => {
		expect(extractDpdParcelNumber('10324321055513876329U101616')).toBe(
			'1055513876329U',
		);
		expect(extractDpdParcelNumber('1055513876329U')).toBeNull();
	});
});

describe('detectCarrierFromText', () => {
	it.each([
		['ORLEN PACZKA Numer paczki:', 'orlen'],
		['InPost Paczkomat', 'inpost'],
		['dpd Polska', 'dpd'],
		['DHL Parcel', 'dhl'],
		['Poczta Polska S.A.', 'poczta-polska'],
		['Allegro One Box', 'allegro-one'],
		['Chemia gospodarcza', null],
	])('%s → %s', (text, carrier) => {
		expect(detectCarrierFromText(text)).toBe(carrier);
	});
});
