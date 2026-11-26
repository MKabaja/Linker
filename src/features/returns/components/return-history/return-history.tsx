import type {
	ReturnEvent,
	ReturnEventKind,
} from '@/features/returns/model/returns.types';
import { formatWarsawDateTime } from '@/shared/lib/warsaw-time';
import { returnHistoryStyles } from './return-history.styles';

type ReturnHistoryProps = { events: ReturnEvent[] };

type LabelByEventKind = Record<ReturnEventKind, string>;

const labelByEventKind: LabelByEventKind = {
	created: 'Przyjęto zwrot',
	updated: 'Zmieniono zwrot',
};

export function ReturnHistory({ events }: ReturnHistoryProps) {
	const { section, heading, list, event, kind, meta } = returnHistoryStyles;

	return (
		<section aria-labelledby="return-history-heading" className={section}>
			<h2 id="return-history-heading" className={heading}>
				Historia zmian
			</h2>
			<ul className={list}>
				{events.map((returnEvent) => (
					<li key={returnEvent.id} className={event}>
						<span className={kind}>{labelByEventKind[returnEvent.kind]}</span>
						<time
							className={meta}
							dateTime={returnEvent.createdAt.toISOString()}
						>
							{formatWarsawDateTime(returnEvent.createdAt)}
						</time>
						<span className={meta}>{returnEvent.userName}</span>
					</li>
				))}
			</ul>
		</section>
	);
}
