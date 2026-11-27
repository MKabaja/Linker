import type {
	OrderPacking,
	PickPackEvent,
	ShipmentDate,
	TrackingEvent,
} from '@/features/returns/model/order-live.types';

const PACKING_FINISHED_ACTION_TYPE = 11;
const TRACKING_STATUS_SHIPPED = 2;
const TRACKING_STATUS_CANCELLED = 10;

/**
 * Zwraca, kto i kiedy skończył pakowanie (ostatnie zdarzenie „koniec pakowania”).
 *
 * @returns `null`, gdy w historii nie ma takiego zdarzenia (pakowanie poza modułem BaseLinkera).
 */
function findPacking(events: PickPackEvent[]): OrderPacking | null {
	const latestFinish = events
		.filter(({ actionType }) => actionType === PACKING_FINISHED_ACTION_TYPE)
		.reduce<PickPackEvent | null>(
			(latest, event) =>
				latest === null || event.at > latest.at ? event : latest,
			null,
		);

	return latestFinish
		? { packerName: latestFinish.profileName, packedAt: latestFinish.at }
		: null;
}

/**
 * Wybiera datę wysyłki: pierwsze zdarzenie ze statusem „nadana” lub późniejszym (bez anulowanych).
 *
 * @remarks Gdy takiego zdarzenia nie ma, zwraca najwcześniejsze zdarzenie jako `labelCreated`; bez zdarzeń `null`.
 */
function findShipmentDate(events: TrackingEvent[]): ShipmentDate | null {
	const shipped = findEarliest(events.filter(isShippedEvent));

	if (shipped) {
		return { kind: 'shipped', at: shipped.at };
	}

	const earliest = findEarliest(events);

	return earliest ? { kind: 'labelCreated', at: earliest.at } : null;
}

function isShippedEvent({ status }: TrackingEvent): boolean {
	return (
		status >= TRACKING_STATUS_SHIPPED && status !== TRACKING_STATUS_CANCELLED
	);
}

function findEarliest(events: TrackingEvent[]): TrackingEvent | null {
	return events.reduce<TrackingEvent | null>(
		(earliest, event) =>
			earliest === null || event.at < earliest.at ? event : earliest,
		null,
	);
}

export { findPacking, findShipmentDate };
