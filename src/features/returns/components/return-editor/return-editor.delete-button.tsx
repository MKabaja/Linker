'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/shared/components/button';
import { deleteReturnAction } from '@/features/returns/actions';
import { returnDeleteButtonStyles } from './return-editor.styles';

type ReturnDeleteButtonProps = { returnId: number };

export function ReturnDeleteButton({ returnId }: ReturnDeleteButtonProps) {
	const { root, heading, actions, question, error } = returnDeleteButtonStyles;
	const router = useRouter();
	const [isConfirming, setIsConfirming] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isDeleting, startTransition] = useTransition();

	function deleteReturn() {
		startTransition(async () => {
			const result = await deleteReturnAction({ returnId });

			if (result.status === 'deleted' || result.status === 'notFound') {
				router.replace('/returns');
				return;
			}

			setErrorMessage('Nie udało się usunąć zwrotu.');
			setIsConfirming(false);
		});
	}

	return (
		<section aria-labelledby="return-delete-heading" className={root}>
			<h2 id="return-delete-heading" className={heading}>
				Strefa niebezpieczna
			</h2>
			{errorMessage && (
				<p role="alert" className={error}>
					{errorMessage}
				</p>
			)}
			{isConfirming ? (
				<div
					role="alertdialog"
					aria-label="Potwierdź usunięcie"
					className={actions}
				>
					<span className={question}>
						Na pewno usunąć ten zwrot? Zostanie w historii i będzie można go
						przywrócić.
					</span>
					<Button
						variant="destructive"
						disabled={isDeleting}
						onClick={deleteReturn}
					>
						Tak, usuń
					</Button>
					<Button
						variant="outline"
						disabled={isDeleting}
						onClick={() => setIsConfirming(false)}
					>
						Anuluj
					</Button>
				</div>
			) : (
				<div className={actions}>
					<Button variant="destructive" onClick={() => setIsConfirming(true)}>
						Usuń zwrot
					</Button>
				</div>
			)}
		</section>
	);
}
