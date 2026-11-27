import { describe, expect, it } from 'vitest';
import type { IndexedOrder } from '@/features/returns/model/order-scoring.types';
import { toTypedNumberCandidate } from '@/features/returns/server/mappers/typed-number-candidate.mapper';

const order: IndexedOrder = {
	orderId: 1,
	externalOrderId: 'X',
	source: 'allegro',
	statusId: 1,
	dateAdd: 1_700_000_000,
	dateConfirmed: 1_700_003_600,
	phoneDigits: '',
	firstNameNorm: 'jan',
	lastNameNorm: 'kowalski',
	postcode: '00950',
	cityNorm: 'warszawa',
	packageNumbers: ['A00ABC1234'],
};

describe('toTypedNumberCandidate', () => {
	it('składa imię i nazwisko z wielkich liter i bierze datę potwierdzenia', () => {
		const candidate = toTypedNumberCandidate({
			order,
			packageNumber: 'A00ABC1234',
			returnReference: null,
			existingReturn: null,
		});

		expect(candidate.customerName).toBe('Jan Kowalski');
		expect(candidate.orderedAt).toBe('2023-11-14T23:13:20.000Z');
	});

	it('wraca do daty dodania, gdy brak potwierdzenia, i pomija puste nazwisko', () => {
		const candidate = toTypedNumberCandidate({
			order: { ...order, dateConfirmed: 0, lastNameNorm: '' },
			packageNumber: null,
			returnReference: 'NZ5J/2026',
			existingReturn: null,
		});

		expect(candidate.customerName).toBe('Jan');
		expect(candidate.orderedAt).toBe('2023-11-14T22:13:20.000Z');
		expect(candidate.returnReference).toBe('NZ5J/2026');
	});
});
