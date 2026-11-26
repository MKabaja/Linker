import 'server-only';
import { returnKindLabelByKind } from '@/features/returns/model/returns.constants';
import type {
	DuplicateReturnWarning,
	ReturnRecord,
} from '@/features/returns/model/returns.types';
import { formatWarsawDateTime } from '@/shared/lib/warsaw-time';

export function toDuplicateReturnWarning(
	returnRecord: ReturnRecord,
): DuplicateReturnWarning {
	return {
		returnId: returnRecord.id,
		orderId: returnRecord.orderId,
		receivedAt: returnRecord.createdAt,
		receivedAtLabel: formatWarsawDateTime(returnRecord.createdAt),
		receivedByName: returnRecord.receivedBy.name,
		kind: returnRecord.kind,
		kindLabel: returnKindLabelByKind[returnRecord.kind],
	};
}
