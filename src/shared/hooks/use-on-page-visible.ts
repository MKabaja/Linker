import { useEffect, useEffectEvent } from 'react';

type PageVisibleHandler = () => void;

/**
 * Wywołuje `handler` przy każdym powrocie na kartę przeglądarki.
 *
 * Nie wywołuje go przy montowaniu ani przy chowaniu karty.
 * `handler` nie musi mieć stabilnej referencji: zawsze działa jego najnowsza wersja.
 */
export function useOnPageVisible(handler: PageVisibleHandler): void {
	const onPageVisible = useEffectEvent(handler);

	useEffect(() => {
		function handleVisibilityChange() {
			if (document.visibilityState !== 'visible') return;
			onPageVisible();
		}
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, []);
}
