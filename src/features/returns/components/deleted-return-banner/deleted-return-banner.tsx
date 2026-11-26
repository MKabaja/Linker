'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/shared/components/button';
import { restoreReturnAction } from '@/features/returns/actions';
import { deletedReturnBannerStyles } from './deleted-return-banner.styles';

type DeletedReturnBannerProps = {
	returnId: number;
	deletedAtLabel: string;
	deletedByName: string;
};

export function DeletedReturnBanner({
	returnId,
	deletedAtLabel,
	deletedByName,
}: DeletedReturnBannerProps) {
	const { banner, title, hint, error } = deletedReturnBannerStyles;
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isRestoring, startTransition] = useTransition();

	function restore() {
		startTransition(async () => {
			const result = await restoreReturnAction({ returnId });

			setErrorMessage(
				result.status === 'restored'
					? null
					: 'Nie udało się przywrócić zwrotu.',
			);
		});
	}

	return (
		<div className={banner}>
			<div>
				<p className={title}>
					Zwrot usunięty {deletedAtLabel} przez {deletedByName}
				</p>
				<p className={hint}>
					Zwrot jest tylko w historii i nie można go edytować.
				</p>
				{errorMessage && (
					<p role="alert" className={error}>
						{errorMessage}
					</p>
				)}
			</div>
			<Button disabled={isRestoring} onClick={restore}>
				Przywróć
			</Button>
		</div>
	);
}
