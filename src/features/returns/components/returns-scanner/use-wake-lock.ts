'use client';

import { useEffect } from 'react';

const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Mobile/i;

/**
 * Telefon nie gasi ekranu, dopóki skaner jest otwarty (Screen Wake Lock API, wymaga HTTPS).
 * System zdejmuje blokadę po schowaniu karty, więc jest odnawiana po każdym powrocie.
 * Na komputerze nic nie robi.
 */
function useWakeLock(isEnabled: boolean): void {
	useEffect(() => {
		if (
			!isEnabled ||
			!('wakeLock' in navigator) ||
			!MOBILE_USER_AGENT.test(navigator.userAgent)
		) {
			return;
		}
		let lock: WakeLockSentinel | null = null;
		let isDisposed = false;

		async function acquire() {
			if (
				isDisposed ||
				document.visibilityState !== 'visible' ||
				(lock && !lock.released)
			) {
				return;
			}
			try {
				const acquired = await navigator.wakeLock.request('screen');
				if (isDisposed) {
					await acquired.release();
					return;
				}
				lock = acquired;
			} catch {
				// Brak zgody systemu (np. oszczędzanie baterii): skaner działa dalej.
			}
		}

		function handleVisibilityChange() {
			void acquire();
		}

		document.addEventListener('visibilitychange', handleVisibilityChange);
		void acquire();
		return () => {
			isDisposed = true;
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			lock?.release().catch(() => undefined);
		};
	}, [isEnabled]);
}

export { useWakeLock };
