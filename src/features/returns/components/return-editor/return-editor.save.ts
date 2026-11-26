import { updateReturnAction } from '@/features/returns/actions';
import type { UpdateReturnInput } from '@/features/returns/model/returns.schemas';

type FailedStatus = 'notFound' | 'invalid';

type MessageByFailedStatus = Record<FailedStatus, string>;

const messageByFailedStatus: MessageByFailedStatus = {
	notFound: 'Ten zwrot już nie istnieje.',
	invalid: 'Nie udało się zapisać: niepoprawne dane.',
};

/**
 * Zapisuje zmiany zwrotu i zwraca komunikat błędu albo `null`, gdy zapis się udał.
 */
export async function saveReturnChanges(
	input: UpdateReturnInput,
): Promise<string | null> {
	const result = await updateReturnAction(input);

	return result.status === 'updated'
		? null
		: messageByFailedStatus[result.status];
}
