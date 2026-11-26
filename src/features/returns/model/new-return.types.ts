import type {
	ReturnItem,
	ReturnMatchedBy,
} from '@/features/returns/model/returns.types';

type NewReturnItem = Omit<ReturnItem, 'id'> & { position: number };

/** Zwrot do zapisania wraz z pozycjami i wpisem `created` w historii. */
type NewReturn = {
	orderId: number;
	source: string;
	note: string;
	/** `null` tylko dla `matchedBy: 'imported'`. */
	receivedBy: number | null;
	matchedBy: ReturnMatchedBy;
	/** Numer etykiety lub paczki, który dał trafienie. */
	scannedLabel: string | null;
	items: NewReturnItem[];
	createdAt: Date;
	updatedAt: Date;
};

export type { NewReturn, NewReturnItem };
