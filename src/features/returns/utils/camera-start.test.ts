import { describe, expect, it } from 'vitest';
import { decideCameraStart } from '@/features/returns/utils/camera-start';

describe('decideCameraStart', () => {
	it('czeka z decyzją, dopóki nie wiadomo, jaki jest wskaźnik', () => {
		expect(
			decideCameraStart({ isCoarsePointer: null, isStartRequested: false }),
		).toBe('unknown');
	});

	it('na telefonie startuje od razu', () => {
		expect(
			decideCameraStart({ isCoarsePointer: true, isStartRequested: false }),
		).toBe('allowed');
	});

	it('na komputerze czeka na kliknięcie', () => {
		expect(
			decideCameraStart({ isCoarsePointer: false, isStartRequested: false }),
		).toBe('waiting');
	});

	it('po kliknięciu pozwala na start', () => {
		expect(
			decideCameraStart({ isCoarsePointer: false, isStartRequested: true }),
		).toBe('allowed');
	});
});
