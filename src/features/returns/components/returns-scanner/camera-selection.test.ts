import { describe, expect, it } from 'vitest';
import { type CameraCandidate, selectCamera } from './camera-selection';

function camera(id: string, label: string): CameraCandidate {
	return { deviceId: id, label };
}

const fiveCameraPhone = [
	camera('f0', 'camera2 1, facing front'),
	camera('b0', 'camera2 0, facing back'),
	camera('b2', 'camera2 2, facing back'),
	camera('b3', 'camera2 3, facing back'),
	camera('b4', 'camera2 4, facing back'),
];

describe('selectCamera', () => {
	it('na telefonie z 5 kamerami używa numerów 4 (bliżej) i 2 (szerzej) z listy tylne najpierw', () => {
		expect(selectCamera(fiveCameraPhone, 'near')).toEqual({
			deviceId: 'b4',
			canSwitchView: true,
		});
		expect(selectCamera(fiveCameraPhone, 'wide')).toEqual({
			deviceId: 'b2',
			canSwitchView: true,
		});
	});

	it('gdy numer 4 to przednia kamera, wybiera z tylnych', () => {
		const cameras = [
			camera('b0', 'camera2 0, facing back'),
			camera('b2', 'camera2 2, facing back'),
			camera('b3', 'camera2 3, facing back'),
			camera('f1', 'camera2 1, facing front'),
			camera('f4', 'camera2 4, facing front'),
		];
		expect(selectCamera(cameras, 'near').deviceId).toBe('b3');
		expect(selectCamera(cameras, 'wide').deviceId).toBe('b2');
	});

	it('nigdy nie zwraca przedniej kamery, gdy są dwie tylne', () => {
		const cameras = [
			camera('f1', 'camera2 1, facing front'),
			camera('b0', 'camera2 0, facing back'),
			camera('b2', 'camera2 2, facing back'),
		];
		expect(selectCamera(cameras, 'wide').deviceId).toBe('b2');
		expect(selectCamera(cameras, 'near').deviceId).toBe('b0');
	});

	it('z jedną tylną kamerą ukrywa przełącznik i wybiera tę kamerę', () => {
		const cameras = [
			camera('f1', 'camera2 1, facing front'),
			camera('b0', 'camera2 0, facing back'),
		];
		expect(selectCamera(cameras, 'near')).toEqual({
			deviceId: 'b0',
			canSwitchView: false,
		});
		expect(selectCamera(cameras, 'wide').deviceId).toBe('b0');
	});

	it('bez etykiet bierze pierwszą kamerę i ukrywa przełącznik', () => {
		const cameras = [camera('a', ''), camera('b', ''), camera('c', '')];
		expect(selectCamera(cameras, 'near')).toEqual({
			deviceId: 'a',
			canSwitchView: false,
		});
	});

	it('rozpoznaje polskie etykiety', () => {
		const cameras = [
			camera('p', 'Kamera przednia'),
			camera('t1', 'Kamera tylna'),
			camera('t2', 'Kamera tylna szerokokątna'),
		];
		expect(selectCamera(cameras, 'wide').deviceId).toBe('t2');
		expect(selectCamera(cameras, 'near').deviceId).toBe('t1');
	});

	it('zwraca brak urządzenia dla pustej listy', () => {
		expect(selectCamera([], 'near')).toEqual({
			deviceId: undefined,
			canSwitchView: false,
		});
	});
});
