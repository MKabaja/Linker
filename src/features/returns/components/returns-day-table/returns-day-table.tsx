import Link from 'next/link';
import { ReturnKindChip } from '@/features/returns/components/return-kind-chip';
import type { ReturnRecord } from '@/features/returns/model/returns.types';
import { formatWarsawTime } from '@/shared/lib/warsaw-time';
import { returnsDayTableStyles } from './returns-day-table.styles';

type ReturnsDayTableProps = { returns: ReturnRecord[] };

const columnLabels = [
	'Godzina',
	'Zamówienie',
	'Źródło',
	'Rodzaj',
	'Sztuki',
	'Notatka',
];

export function ReturnsDayTable({ returns }: ReturnsDayTableProps) {
	const {
		wrapper,
		tableElement,
		caption,
		head,
		headerCell,
		bodyRow,
		bodyCell,
		timeCell,
		orderLink,
		quantityCell,
		noteCell,
		importMark,
		empty,
	} = returnsDayTableStyles;

	if (returns.length === 0) {
		return <p className={empty}>Brak zwrotów przyjętych tego dnia.</p>;
	}

	return (
		<div className={wrapper}>
			<table className={tableElement}>
				<caption className={caption}>Zwroty przyjęte w wybranym dniu</caption>
				<thead className={head}>
					<tr>
						{columnLabels.map((label) => (
							<th key={label} scope="col" className={headerCell}>
								{label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{returns.map((returnRecord) => (
						<tr key={returnRecord.id} className={bodyRow}>
							<td className={`${bodyCell} ${timeCell}`}>
								{formatWarsawTime(returnRecord.createdAt)}
							</td>
							<td className={bodyCell}>
								<Link
									href={`/returns/${returnRecord.id}`}
									className={orderLink}
								>
									{returnRecord.orderId}
								</Link>
							</td>
							<td className={bodyCell}>{returnRecord.source}</td>
							<td className={bodyCell}>
								<ReturnKindChip kind={returnRecord.kind} />
							</td>
							<td className={`${bodyCell} ${quantityCell}`}>
								{formatQuantities(returnRecord)}
							</td>
							<td className={`${bodyCell} ${noteCell}`}>
								{returnRecord.receivedBy.id === null && (
									<span className={importMark}>import</span>
								)}{' '}
								{returnRecord.note}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function formatQuantities({ items }: ReturnRecord): string {
	const received = items.reduce((sum, item) => sum + item.quantityReceived, 0);
	const ordered = items.reduce((sum, item) => sum + item.quantityOrdered, 0);

	return `${received} / ${ordered}`;
}
