import { useEffect, useState } from 'react';
import { listPendingReturnsAction } from '@/features/returns/actions';
import type { PendingReturnView } from '@/features/returns/model/typed-number.types';

type PendingReturnsState =
	| { status: 'loading' }
	| { status: 'error' }
	| { status: 'ready'; returns: PendingReturnView[] };

/**
 * Pobiera oczekujące zwroty z BaseLinkera przy montowaniu (ponowienie to ponowne zamontowanie przez `key`).
 * Błąd sieci lub serwera jest stanem `error`, a spóźniona odpowiedź po odmontowaniu jest ignorowana.
 */
function usePendingReturns(): PendingReturnsState {
	const [state, setState] = useState<PendingReturnsState>({
		status: 'loading',
	});

	useEffect(() => {
		let isCurrent = true;
		listPendingReturnsAction()
			.then((returns) => {
				if (isCurrent) {
					setState({ status: 'ready', returns });
				}
			})
			.catch(() => {
				if (isCurrent) {
					setState({ status: 'error' });
				}
			});
		return () => {
			isCurrent = false;
		};
	}, []);

	return state;
}

export { usePendingReturns };
