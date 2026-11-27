import 'server-only';
import type {
	PickPackEvent,
	TrackingEvent,
} from '@/features/returns/model/order-live.types';
import type { StatusEventsByPackageId } from '@/features/returns/server/sources/baselinker.client';
import type {
	BaseLinkerPickPackEntry,
	BaseLinkerShipment,
	BaseLinkerStatusEvent,
} from '@/features/returns/server/sources/baselinker.schemas';

const MILLISECONDS_PER_SECOND = 1000;

type TrackingEventsSource = {
	shipments: BaseLinkerShipment[];
	historyByPackageId: StatusEventsByPackageId;
};

/**
 * Mapuje historię kompletacji i pakowania na zdarzenia; wpisy bez daty są pomijane.
 */
function mapBaseLinkerPickPackEvents(
	entries: BaseLinkerPickPackEntry[],
): PickPackEvent[] {
	return entries
		.filter(({ entry_date }) => entry_date > 0)
		.map((entry) => ({
			actionType: entry.action_type,
			profileName: entry.profile_id.trim(),
			at: fromUnixSeconds(entry.entry_date),
		}));
}

/**
 * Zbiera zdarzenia śledzenia przesyłek wychodzących: wpisy historii oraz bieżący status każdej przesyłki
 * (na wypadek, gdy historia jest pusta). Przesyłki zwrotne są pomijane, wpisy bez daty też.
 */
function mapBaseLinkerTrackingEvents({
	shipments,
	historyByPackageId,
}: TrackingEventsSource): TrackingEvent[] {
	return shipments
		.filter(({ is_return }) => !is_return)
		.flatMap((shipment) => [
			{
				tracking_status: shipment.tracking_status,
				tracking_status_date: shipment.tracking_status_date,
			},
			...(historyByPackageId.get(shipment.package_id) ?? []),
		])
		.filter(hasDate)
		.map((event) => ({
			status: event.tracking_status,
			at: fromUnixSeconds(event.tracking_status_date),
		}));
}

function hasDate({ tracking_status_date }: BaseLinkerStatusEvent): boolean {
	return tracking_status_date > 0;
}

function fromUnixSeconds(seconds: number): Date {
	return new Date(seconds * MILLISECONDS_PER_SECOND);
}

export { mapBaseLinkerPickPackEvents, mapBaseLinkerTrackingEvents };
