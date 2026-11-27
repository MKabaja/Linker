import { describe, expect, it } from 'vitest';
import { collectPackageNumbersByOrderId } from '@/features/returns/server/mappers/package-numbers.mapper';

describe('collectPackageNumbersByOrderId', () => {
	it('łączy numery paczek ze zwrotami bez duplikatów i pustych wartości', () => {
		const numbersByOrderId = collectPackageNumbersByOrderId({
			packages: [
				{ orderId: 357769987, packageNumber: '31863813384', innerNumber: '' },
				{
					orderId: 356095152,
					packageNumber: '600000276632432022076273',
					innerNumber: 'RETURN600000276632432022076273',
				},
			],
			returns: [
				{ orderId: 357769987, packageNumber: '31863808287' },
				{ orderId: 356095152, packageNumber: '600000276632432022076273' },
				{ orderId: 357769987, packageNumber: '' },
				{ orderId: 111, packageNumber: 'PX7758146312' },
			],
		});

		expect(numbersByOrderId.get(357769987)).toEqual([
			'31863813384',
			'31863808287',
		]);
		expect(numbersByOrderId.get(356095152)).toEqual([
			'600000276632432022076273',
			'RETURN600000276632432022076273',
		]);
		expect(numbersByOrderId.get(111)).toEqual(['PX7758146312']);
	});
});
