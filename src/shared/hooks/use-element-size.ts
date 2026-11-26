import { type RefCallback, useState } from 'react';

type ElementSize = { width: number; height: number };

type UseElementSizeResult<Element extends HTMLElement> = {
	ref: RefCallback<Element>;
	size: ElementSize;
};

const EMPTY_SIZE: ElementSize = { width: 0, height: 0 };

/**
 * Zwraca `ref` i aktualny rozmiar elementu (`ResizeObserver`). Do pierwszego pomiaru rozmiar to 0 × 0.
 */
export function useElementSize<
	Element extends HTMLElement,
>(): UseElementSizeResult<Element> {
	const [size, setSize] = useState(EMPTY_SIZE);

	function ref(element: Element | null) {
		if (!element) {
			return;
		}
		const observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			setSize((previous) =>
				previous.width === width && previous.height === height
					? previous
					: { width, height },
			);
		});
		observer.observe(element);
		return () => observer.disconnect();
	}

	return { ref, size };
}
