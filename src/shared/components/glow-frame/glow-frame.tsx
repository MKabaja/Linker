'use client';

import { cn } from 'cn';
import { type ComponentProps, useEffect, useRef } from 'react';
import { glowFrameStyles } from './glow-frame.styles';

type GlowFrameProps = ComponentProps<'div'>;

const FINE_POINTER_QUERY = '(pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function GlowFrame({ className, children, ...props }: GlowFrameProps) {
	const frameRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const frame = frameRef.current;
		const shouldFollowPointer =
			window.matchMedia(FINE_POINTER_QUERY).matches &&
			!window.matchMedia(REDUCED_MOTION_QUERY).matches;
		if (!frame || !shouldFollowPointer) {
			return;
		}
		let animationFrame = 0;

		function handlePointerMove({ clientX, clientY }: PointerEvent) {
			cancelAnimationFrame(animationFrame);
			animationFrame = requestAnimationFrame(() => {
				const { left, top } = frame?.getBoundingClientRect() ?? {
					left: 0,
					top: 0,
				};
				frame?.style.setProperty('--glow-x', `${clientX - left}px`);
				frame?.style.setProperty('--glow-y', `${clientY - top}px`);
			});
		}

		window.addEventListener('pointermove', handlePointerMove);
		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			cancelAnimationFrame(animationFrame);
		};
	}, []);

	return (
		<div
			ref={frameRef}
			className={cn(glowFrameStyles.root, className)}
			{...props}
		>
			<span aria-hidden className={glowFrameStyles.halo} />
			{children}
			<span aria-hidden className={glowFrameStyles.edge} />
		</div>
	);
}
