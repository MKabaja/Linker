import { toast } from 'sonner';
import type { SearchCandidate } from '@/features/returns/model/order-search.types';
import type { DuplicateReturnWarning } from '@/features/returns/model/returns.types';
import type { TraceEntry } from '@/features/returns/model/traces.types';
import { detectCarrier } from '@/features/returns/utils/carrier';
import { pickScannedLabel } from '@/features/returns/utils/scanned-label';
import { shortenNumber } from '@/features/returns/utils/trace-format';

const TOAST_DURATION_MS = 8_000;
const UNKNOWN_CARRIER_LABEL = 'Paczka';

type CarrierLabelByCarrier = Record<string, string>;

const carrierLabelByCarrier: CarrierLabelByCarrier = {
	inpost: 'InPost',
	'inpost-zwrot': 'InPost zwrot',
	dpd: 'DPD',
	dhl: 'DHL',
	'poczta-polska': 'Poczta Polska',
	'dhl-lub-gls': 'DHL lub GLS',
	gls: 'GLS',
	orlen: 'Orlen Paczka',
};

type MatchedParcelInput = {
	entries: TraceEntry[];
	candidate: SearchCandidate;
};

type DuplicateToastInput = MatchedParcelInput & {
	existingReturn: DuplicateReturnWarning;
};

/**
 * Opisuje przewoźnika i skrócony numer przesyłki, która dała trafienie, np. `InPost 6209…1767`.
 * Zwraca `undefined`, gdy trafienie nie wyszło z jednoznacznego numeru paczki (np. telefon albo numer z dziurą).
 */
function describeMatchedParcel({
	entries,
	candidate,
}: MatchedParcelInput): string | undefined {
	const label = pickScannedLabel({ entries, candidate });
	if (!label) {
		return undefined;
	}
	const carrier = detectCarrier(label);
	const carrierLabel = carrier
		? (carrierLabelByCarrier[carrier] ?? UNKNOWN_CARRIER_LABEL)
		: UNKNOWN_CARRIER_LABEL;
	return `${carrierLabel} ${shortenNumber(label)}`;
}

/**
 * Pokazuje skanującemu, jakie zamówienie i jaka paczka dały trafienie, żeby mógł to zweryfikować.
 * Toast przeżywa przejście na ekran zwrotu, bo `Toaster` jest w głównym layoucie.
 */
function showMatchToast(input: MatchedParcelInput): void {
	const parcel = describeMatchedParcel(input);
	const title = `Zamówienie ${input.candidate.orderId}`;
	toast.success(parcel ? `${title}: ${parcel}` : title, {
		description: parcel
			? undefined
			: input.candidate.reasons.map((reason) => reason.label).join(' · '),
		duration: TOAST_DURATION_MS,
	});
}

/**
 * Ostrzega, że zwrot dla tego zamówienia już przyjęto, z datą i osobą.
 */
function showDuplicateToast({
	existingReturn,
	...input
}: DuplicateToastInput): void {
	const parcel = describeMatchedParcel(input);
	const title = `Zamówienie ${input.candidate.orderId}${parcel ? `: ${parcel}` : ''}`;
	toast.warning(title, {
		description: `Zwrot już przyjęty ${existingReturn.receivedAtLabel} przez ${existingReturn.receivedByName}`,
		duration: TOAST_DURATION_MS,
		style: {
			color: 'var(--color-warning)',
			borderColor: 'var(--color-warning)',
		},
	});
}

export { describeMatchedParcel, showDuplicateToast, showMatchToast };
