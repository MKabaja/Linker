import { describe, expect, it } from 'vitest';
import { detectCarrier } from '@/features/returns/utils/carrier';
import { createOcrResponse } from '@/features/returns/utils/ocr.test-helper';
import { patternToString } from '@/features/returns/utils/pattern-parser';
import {
	readFromBarcode,
	readsFromManual,
	readsFromOcr,
} from '@/features/returns/utils/read-classifier';

const BOX = { x: 0, y: 0, width: 10, height: 10 };

describe('klasyfikacja odczytów', () => {
	it('rozpoznaje numer paczki, order_id, telefon, maski i kod pocztowy; pomija sklep', () => {
		const reads = readsFromOcr(
			createOcrResponse([
				['tess-digits', '6209 9966 9161 2345 6789 0166'],
				['tess-general', 'Zam. 312345678'],
				['tess-general', 'Tel. 7320***83'],
				['tess-general', 'Odbiorca: m*** ka***'],
				['tess-general', '31-123 Miasto'],
				['tess-general', 'Drogeria, 32-432 Pcim 720'],
				['tess-general', 'tel. 500 10 90 93'],
				['tess-general', 'ID 1234X567890'],
			]),
		);

		expect(reads.map((read) => `${read.kind}:${read.source}`)).toEqual([
			'package:tess-digits',
			'orderId:tess-general',
			'phone:tess-general',
			'name:tess-general',
			'postcode:tess-general',
			'externalId:tess-general',
		]);
	});

	it('słowa z PSM 11 sklejane w wiersz; grupy cyfr z tess-digits w jeden numer', () => {
		const reads = readsFromOcr(
			createOcrResponse([
				['tess-general', 'm***', { x: 100, y: 200, width: 40, height: 20 }],
				['tess-general', 'ka***', { x: 150, y: 202, width: 50, height: 20 }],
				[
					'tess-general',
					'7320***83',
					{ x: 100, y: 300, width: 90, height: 20 },
				],
				[
					'tess-digits',
					'6209 9966 9161 2345 6789 0166',
					{ x: 0, y: 500, width: 400, height: 30 },
				],
				[
					'tess-digits',
					'6209 9966 9102 3330 0501 5096',
					{ x: 0, y: 600, width: 400, height: 30 },
				],
			]),
		);

		expect(reads.map((read) => read.kind)).toEqual([
			'package',
			'name',
			'phone',
		]);
		const name = reads.find((read) => read.kind === 'name');
		expect(name?.query.kind === 'name' && name.query.prefixes).toEqual([
			'm',
			'ka',
		]);
		expect(name?.bbox).toEqual({ x: 100, y: 200, width: 100, height: 22 });
		const packageQuery = reads[0].query;
		expect(
			packageQuery.kind === 'package' && patternToString(packageQuery.pattern),
		).toBe('620999669161234567890166');
	});

	it('numer zwrotny InPost z kodu nie jest tropem, ale przewoźnik jest rozpoznany', () => {
		expect(readFromBarcode('620999669102333123456789')).toBeNull();
		expect(detectCarrier('620999669102333123456789')).toBe('inpost-zwrot');
		expect(readFromBarcode('620999669161234567890166', BOX)?.kind).toBe(
			'package',
		);
		expect(detectCarrier('1012345678901U')).toBe('dpd');
	});

	it('ręczne wpisanie', () => {
		const reads = readsFromManual('312345678, 7320***83');

		expect(reads.map((read) => read.kind)).toEqual(['orderId', 'phone']);
		expect(reads.every((read) => read.source === 'manual')).toBe(true);
	});
});
