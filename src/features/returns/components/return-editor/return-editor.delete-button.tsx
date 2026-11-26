import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/shared/components/button';
import { deleteReturnAction } from '@/features/returns/actions';
import { returnDeleteButtonStyles } from './return-editor.styles';

type ReturnDeleteButtonProps = {
	returnId: number;
	onError: (message: string) => void;
};

export function ReturnDeleteButton({
	returnId,
	onError,
}: ReturnDeleteButtonProps) {
	const { root, question } = returnDeleteButtonStyles;
	const router = useRouter();
	const [isConfirming, setIsConfirming] = useState(false);
	const [isDeleting, startTransition] = useTransition();

	function deleteReturn() {
		startTransition(async () => {
			const result = await deleteReturnAction({ returnId });

			if (result.status === 'deleted' || result.status === 'notFound') {
				router.replace('/returns');
				return;
			}

			onError('Nie udało się usunąć zwrotu.');
			setIsConfirming(false);
		});
	}

	if (!isConfirming) {
		return (
			<div className={root}>
				<Button variant="destructive" onClick={() => setIsConfirming(true)}>
					Usuń zwrot
				</Button>
			</div>
		);
	}

	return (
		<div role="alertdialog" aria-label="Potwierdź usunięcie" className={root}>
			<span className={question}>Na pewno usunąć ten zwrot?</span>
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
	);
}
