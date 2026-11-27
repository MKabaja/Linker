import { describe, expect, it } from 'vitest';
import type { IndexedOrderItem } from '@/features/returns/model/order-index.types';
import {
	mapProductImageRecords,
	matchReturnItemProductIds,
	pickFirstImageUrl,
} from './product-image.mapper';

function buildIndexedItem(
	overrides: Partial<IndexedOrderItem> = {},
): IndexedOrderItem {
	return {
		position: 0,
		orderProductId: 11,
		productId: '283583043',
		name: 'Produkt',
		ean: '5901',
		sku: 'SKU-1',
		quantity: 1,
		...overrides,
	};
}

describe('matchReturnItemProductIds', () => {
	it('dopasowuje po order_product_id, potem EAN, potem SKU', () => {
		const indexedItems = [
			buildIndexedItem({
				orderProductId: 11,
				productId: '1',
				ean: 'A',
				sku: 'a',
			}),
			buildIndexedItem({
				orderProductId: 12,
				productId: '2',
				ean: 'B',
				sku: 'b',
			}),
			buildIndexedItem({
				orderProductId: 13,
				productId: '3',
				ean: '',
				sku: 'c',
			}),
		];
		const result = matchReturnItemProductIds(
			[
				{ id: 1, orderProductId: 11, ean: 'X', sku: 'x' },
				{ id: 2, orderProductId: null, ean: 'B', sku: '' },
				{ id: 3, orderProductId: null, ean: '', sku: 'c' },
				{ id: 4, orderProductId: null, ean: '', sku: '' },
			],
			indexedItems,
		);

		expect([...result]).toEqual([
			[1, 1],
			[2, 2],
			[3, 3],
		]);
	});

	it('pomija product_id puste, zerowe i nienumeryczne', () => {
		const result = matchReturnItemProductIds(
			[
				{ id: 1, orderProductId: 1, ean: '', sku: '' },
				{ id: 2, orderProductId: 2, ean: '', sku: '' },
				{ id: 3, orderProductId: 3, ean: '', sku: '' },
			],
			[
				buildIndexedItem({ orderProductId: 1, productId: '' }),
				buildIndexedItem({ orderProductId: 2, productId: '0' }),
				buildIndexedItem({ orderProductId: 3, productId: 'abc' }),
			],
		);

		expect(result.size).toBe(0);
	});
});

describe('pickFirstImageUrl', () => {
	it('bierze najniższy numeryczny klucz', () => {
		expect(
			pickFirstImageUrl({ '10': 'https://a/10.jpg', '2': 'https://a/2.jpg' }),
		).toBe('https://a/2.jpg');
	});

	it('zwraca pusty tekst bez zdjęć lub z niepoprawnym adresem', () => {
		expect(pickFirstImageUrl({})).toBe('');
		expect(pickFirstImageUrl({ '1': 'javascript:alert(1)' })).toBe('');
	});
});

describe('mapProductImageRecords', () => {
	it('zapisuje pusty adres dla produktów, których katalog nie zwrócił', () => {
		const syncedAt = new Date('2026-11-27T10:00:00Z');

		expect(
			mapProductImageRecords({
				productIds: [1, 2],
				imagesById: {
					'1': { ean: ' 59 ', images: { '1': 'https://a/1.jpg' } },
				},
				syncedAt,
			}),
		).toEqual([
			{ productId: 1, ean: '59', imageUrl: 'https://a/1.jpg', syncedAt },
			{ productId: 2, ean: '', imageUrl: '', syncedAt },
		]);
	});
});
