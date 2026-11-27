'use client';

import { useEffect, useEffectEvent } from 'react';

const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Mobile/i;

type WakeLockIssue = 'denied' | 'released';

type UseWakeLockOptions = {
	/** Wywoływany, gdy system odmówi blokady (`denied`) albo ją zdejmie (`released`). */
	onIssue?: (issue: WakeLockIssue) => void;
};

/**
 * Telefon nie gasi ekranu, dopóki `isEnabled` jest prawdziwe (Screen Wake Lock API, wymaga HTTPS).
 * System zdejmuje blokadę po schowaniu karty, więc jest odnawiana po każdym powrocie.
 * Na komputerze nic nie robi.
 */
function useWakeLock(
	isEnabled: boolean,
	{ onIssue }: UseWakeLockOptions = {},
): void {
	const notifyIssue = useEffectEvent((issue: WakeLockIssue) =>
		onIssue?.(issue),
	);

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
				acquired.addEventListener('release', handleRelease);
				lock = acquired;
			} catch {
				notifyIssue('denied');
			}
		}

		function handleRelease() {
			if (!isDisposed) {
				notifyIssue('released');
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

export { useWakeLock, type WakeLockIssue };
