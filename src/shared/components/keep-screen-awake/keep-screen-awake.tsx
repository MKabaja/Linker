'use client';

import { useWakeLock } from '@/shared/hooks/use-wake-lock';

/**
 * Nie renderuje nic; na telefonie nie pozwala zgasnąć ekranowi, dopóki jest zamontowany.
 */
export function KeepScreenAwake() {
	useWakeLock(true);
	return null;
}
