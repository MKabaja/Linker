'use client';

import { useId, useOptimistic, useState, useTransition } from 'react';
import { Checkbox } from '@/shared/components/checkbox';
import { setReturnCorrectionAction } from '@/features/returns/actions';
import { returnCorrectionStyles } from './return-correction.styles';

type ReturnCorrectionProps = {
	returnId: number;
	isIssued: boolean;
	/** Blokuje zmianę, np. gdy zwrot jest usunięty. */
	isDisabled: boolean;
	/** Kto i kiedy zaznaczył; `null`, gdy korekta nie jest wystawiona. */
	issuedLabel: string | null;
};

type FailedStatus = 'notFound' | 'deleted' | 'invalid';

type MessageByFailedStatus = Record<FailedStatus, string>;

const messageByFailedStatus: MessageByFailedStatus = {
	notFound: 'Ten zwrot już nie istnieje.',
	deleted: 'Ten zwrot został usunięty i nie można go zmienić.',
	invalid: 'Nie udało się zapisać: niepoprawne dane.',
};

export function ReturnCorrection({
	returnId,
	isIssued,
	isDisabled,
	issuedLabel,
}: ReturnCorrectionProps) {
	const { root, field, label, status, error } = returnCorrectionStyles;
	const checkboxId = useId();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSaving, startTransition] = useTransition();
	const [shownIsIssued, showIsIssued] = useOptimistic(isIssued);

	function changeIsIssued(nextIsIssued: boolean) {
		startTransition(async () => {
			showIsIssued(nextIsIssued);
			const result = await setReturnCorrectionAction({
				returnId,
				isIssued: nextIsIssued,
			});

			setErrorMessage(
				result.status === 'updated'
					? null
					: messageByFailedStatus[result.status],
			);
		});
	}

	return (
		<div className={root}>
			<label htmlFor={checkboxId} className={field}>
				<Checkbox
					id={checkboxId}
					checked={shownIsIssued}
					disabled={isSaving || isDisabled}
					onChange={(event) => changeIsIssued(event.currentTarget.checked)}
				/>
				<span className={label}>Wystawiono korektę</span>
			</label>
			<p className={status} aria-live="polite">
				{isSaving ? 'Zapisywanie…' : isIssued && issuedLabel}
			</p>
			{errorMessage && (
				<p role="alert" className={error}>
					{errorMessage}
				</p>
			)}
		</div>
	);
}
