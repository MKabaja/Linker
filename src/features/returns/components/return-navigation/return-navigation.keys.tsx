'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReturnNeighbors } from '@/features/returns/model/returns.types';

type ReturnNavigationKeysProps = ReturnNeighbors;

const TEXT_FIELD_SELECTOR =
	'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const OPEN_DIALOG_SELECTOR =
	'[role="dialog"], [role="alertdialog"], dialog[open]';

export function ReturnNavigationKeys({
	previousReturnId,
	nextReturnId,
}: ReturnNavigationKeysProps) {
	const router = useRouter();

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (!isPlainArrowKey(event) || isInteractionBlocked(event)) {
				return;
			}

			const targetReturnId =
				event.key === 'ArrowLeft' ? previousReturnId : nextReturnId;

			if (targetReturnId !== null) {
				router.push(`/returns/${targetReturnId}`);
			}
		}

		window.addEventListener('keydown', handleKeyDown);

		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [router, previousReturnId, nextReturnId]);

	return null;
}

function isPlainArrowKey(event: KeyboardEvent): boolean {
	return (
		(event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
		!event.altKey &&
		!event.ctrlKey &&
		!event.metaKey &&
		!event.shiftKey
	);
}

function isInteractionBlocked(event: KeyboardEvent): boolean {
	const { target } = event;

	return (
		event.defaultPrevented ||
		(target instanceof Element &&
			target.closest(TEXT_FIELD_SELECTOR) !== null) ||
		document.querySelector(OPEN_DIALOG_SELECTOR) !== null
	);
}
