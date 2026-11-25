import { describe, expect, it } from 'vitest';
import { getReturnKind } from '@/features/returns/utils/return-kind';

describe('getReturnKind', () => {
	it('pełny, gdy każda pozycja ma przyjęte co najmniej tyle, ile zamówiono', () => {
		expect(
			getReturnKind([
				{ quantityOrdered: 2, quantityReceived: 2 },
				{ quantityOrdered: 1, quantityReceived: 3 },
				{ quantityOrdered: 0, quantityReceived: 1 },
			]),
		).toBe('full');
	});

	it('częściowy, gdy brakuje choć jednej sztuki', () => {
		expect(
			getReturnKind([
				{ quantityOrdered: 2, quantityReceived: 2 },
				{ quantityOrdered: 2, quantityReceived: 1 },
			]),
		).toBe('partial');
	});

	it('zwrot bez pozycji jest częściowy', () => {
		expect(getReturnKind([])).toBe('partial');
	});
});
