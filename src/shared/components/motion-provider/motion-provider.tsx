'use client';

import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

type MotionProviderProps = { children: ReactNode };

/**
 * Wyłącza animacje ruchu (przesunięcia, skalę) u osób z ustawieniem `prefers-reduced-motion`.
 */
export function MotionProvider({ children }: MotionProviderProps) {
	return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
