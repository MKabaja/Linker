import { updateReturnAction } from '@/features/returns/actions';
import type { UpdateReturnInput } from '@/features/returns/model/returns.schemas';

type FailedStatus = 'notFound' | 'deleted' | 'invalid';

type MessageByFailedStatus = Record<FailedStatus, string>;

const messageByFailedStatus: MessageByFailedStatus = {
	notFound: 'Ten zwrot już nie istnieje.',
	deleted: 'Ten zwrot został usunięty i nie można go edytować.',
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
