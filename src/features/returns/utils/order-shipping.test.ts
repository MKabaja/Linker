import { describe, expect, it } from 'vitest';
import { findPacking, findShipmentDate } from './order-shipping';

function at(seconds: number): Date {
	return new Date(seconds * 1000);
}

describe('findPacking', () => {
	it('bierze najnowszy koniec pakowania', () => {
		expect(
			findPacking([
				{ actionType: 11, profileName: 'Ela', at: at(300) },
				{ actionType: 8, profileName: 'Ela', at: at(100) },
				{ actionType: 11, profileName: 'Ola', at: at(200) },
			]),
		).toEqual({ packerName: 'Ela', packedAt: at(300) });
	});

	it('bez zdarzenia końca pakowania zwraca null', () => {
		expect(
			findPacking([{ actionType: 8, profileName: 'Ela', at: at(100) }]),
		).toBeNull();
		expect(findPacking([])).toBeNull();
	});
});

describe('findShipmentDate', () => {
	it('wybiera pierwsze zdarzenie ze statusem nadana lub późniejszym', () => {
		expect(
			findShipmentDate([
				{ status: 5, at: at(500) },
				{ status: 1, at: at(100) },
				{ status: 2, at: at(200) },
				{ status: 4, at: at(400) },
			]),
		).toEqual({ kind: 'shipped', at: at(200) });
	});

	it('pomija anulowane i nieznane statusy', () => {
		expect(
			findShipmentDate([
				{ status: 10, at: at(100) },
				{ status: 0, at: at(150) },
				{ status: 3, at: at(300) },
			]),
		).toEqual({ kind: 'shipped', at: at(300) });
	});

	it('bez statusu nadania zwraca najwcześniejszą datę jako etykietę', () => {
		expect(
			findShipmentDate([
				{ status: 1, at: at(300) },
				{ status: 1, at: at(200) },
			]),
		).toEqual({ kind: 'labelCreated', at: at(200) });
	});

	it('bez zdarzeń zwraca null', () => {
		expect(findShipmentDate([])).toBeNull();
	});
});
