'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

type RevealTag = 'div' | 'section' | 'li' | 'tr';

type RevealProps = {
	as?: RevealTag;
	/** Numer w kolejce wejścia; im wyższy, tym później element się pojawia (do `MAX_STAGGER_STEPS` kroków). */
	order?: number;
	className?: string;
	children: ReactNode;
};

const REVEAL_DISTANCE_PX = 6;
const REVEAL_DURATION_SECONDS = 0.18;
const STAGGER_STEP_SECONDS = 0.03;
const MAX_STAGGER_STEPS = 10;

const motionComponentByTag = {
	div: motion.div,
	section: motion.section,
	li: motion.li,
	tr: motion.tr,
};

/**
 * Pojawia treść przy pierwszym renderze: zanik z lekkim przesunięciem w górę.
 * Kolejne zmiany danych nie animują się ponownie, bo animacja działa tylko przy zamontowaniu.
 */
export function Reveal({
	as = 'div',
	order = 0,
	className,
	children,
}: RevealProps) {
	const Component = motionComponentByTag[as];

	return (
		<Component
			className={className}
			initial={{ opacity: 0, y: REVEAL_DISTANCE_PX }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: REVEAL_DURATION_SECONDS,
				ease: 'easeOut',
				delay: Math.min(order, MAX_STAGGER_STEPS) * STAGGER_STEP_SECONDS,
			}}
		>
			{children}
		</Component>
	);
}
