import { useEffect, useState } from 'react';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

/**
 * Zwraca `null` do czasu pierwszego odczytu w przeglądarce (render serwerowy nie zna wskaźnika),
 * potem `true` dla ekranu dotykowego i `false` dla myszy.
 */
export function useIsCoarsePointer(): boolean | null {
	const [isCoarsePointer, setIsCoarsePointer] = useState<boolean | null>(null);

	useEffect(() => {
		const query = window.matchMedia(COARSE_POINTER_QUERY);
		function update() {
			setIsCoarsePointer(query.matches);
		}
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	}, []);

	return isCoarsePointer;
}
