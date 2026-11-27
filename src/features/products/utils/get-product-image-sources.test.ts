import { describe, expect, it } from 'vitest';
import {
	getProductImageSources,
	getProductImageVariantUrl,
} from './get-product-image-sources';

const IMAGE_URL = 'https://kozackadrogeria.pl/img/p/3/1/5/3/9/31539.jpg';

describe('getProductImageVariantUrl', () => {
	it('buduje warianty PrestaShop', () => {
		expect(getProductImageVariantUrl(IMAGE_URL, 'small')).toBe(
			'https://kozackadrogeria.pl/img/p/3/1/5/3/9/31539-small_default.jpg',
		);
		expect(getProductImageVariantUrl(IMAGE_URL, 'medium')).toBe(
			'https://kozackadrogeria.pl/img/p/3/1/5/3/9/31539-medium_default.jpg',
		);
	});

	it('zwraca oryginał dla innych adresów', () => {
		const otherUrl = 'https://cdn.example.com/photos/a.png';

		expect(getProductImageVariantUrl(otherUrl, 'small')).toBe(otherUrl);
	});
});

describe('getProductImageSources', () => {
	it('układa kolejno large, oryginał i pvex', () => {
		expect(getProductImageSources({ imageUrl: IMAGE_URL, ean: '590' })).toEqual(
			[
				{
					src: 'https://kozackadrogeria.pl/img/p/3/1/5/3/9/31539-large_default.jpg',
					isOptimizable: true,
				},
				{ src: IMAGE_URL, isOptimizable: true },
				{ src: 'https://orders.pvex.pl/thumbs/590.jpg', isOptimizable: false },
			],
		);
	});

	it('nie optymalizuje obcych hostów i pomija puste źródła', () => {
		expect(
			getProductImageSources({
				imageUrl: 'https://cdn.example.com/a.jpg',
				ean: '',
			}),
		).toEqual([{ src: 'https://cdn.example.com/a.jpg', isOptimizable: false }]);
		expect(getProductImageSources({ imageUrl: undefined, ean: '' })).toEqual(
			[],
		);
	});
});
