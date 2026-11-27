import { FileCheck2 } from 'lucide-react';
import Link from 'next/link';
import { BaseLinkerOrderLink } from '@/features/returns/components/baselinker-order-link';
import { CopyableOrderValue } from '@/features/returns/components/copyable-order-value';
import { ReturnKindChip } from '@/features/returns/components/return-kind-chip';
import { Reveal } from '@/shared/components/reveal';
import type {
	ReturnCorrection,
	ReturnRecord,
} from '@/features/returns/model/returns.types';
import type { ReturnsListScope } from '@/features/returns/model/returns-list.types';
import { toReturnsListSearch } from '@/features/returns/utils/returns-list-query';
import {
	formatWarsawDateTime,
	formatWarsawTime,
} from '@/shared/lib/warsaw-time';
import { returnsDayTableStyles } from './returns-day-table.styles';

type ReturnsDayTableProps = {
	returns: ReturnRecord[];
	/** Zakres listy; trafia do linków szczegółów, żeby szczegół szedł w tej samej kolejności. */
	listScope: ReturnsListScope;
};

const columnLabels = [
	'Godzina',
	'Zamówienie',
	'WMS',
	'ZO',
	'Źródło',
	'Rodzaj',
	'Korekta',
	'Sztuki',
	'Notatka',
	'Szczegóły',
];

export function ReturnsDayTable({ returns, listScope }: ReturnsDayTableProps) {
	const {
		wrapper,
		tableElement,
		caption,
		head,
		headerCell,
		bodyRow,
		bodyCell,
		timeCell,
		codeCell,
		detailsLink,
		quantityCell,
		noteCell,
		importMark,
		correctionCell,
		correctionIssued,
		correctionMissing,
		empty,
	} = returnsDayTableStyles;

	if (returns.length === 0) {
		return (
			<p className={empty}>
				{listScope.correction === 'all'
					? 'Brak zwrotów przyjętych tego dnia.'
					: 'Brak zwrotów tego dnia dla wybranego filtra korekty.'}
			</p>
		);
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
					{returns.map((returnRecord, rowIndex) => (
						<Reveal
							as="tr"
							order={rowIndex}
							key={returnRecord.id}
							className={bodyRow}
						>
							<td className={`${bodyCell} ${timeCell}`}>
								{formatWarsawTime(returnRecord.createdAt)}
							</td>
							<td className={bodyCell}>
								<BaseLinkerOrderLink orderId={returnRecord.orderId} />
							</td>
							<td className={`${bodyCell} ${codeCell}`}>
								<CopyableOrderValue
									label="kod WMS"
									value={returnRecord.wmsCode}
									variant="mono"
								/>
							</td>
							<td className={`${bodyCell} ${codeCell}`}>
								<CopyableOrderValue
									label="numer ZO"
									value={returnRecord.waproOrderNumber}
								/>
							</td>
							<td className={bodyCell}>{returnRecord.source}</td>
							<td className={bodyCell}>
								<ReturnKindChip kind={returnRecord.kind} />
							</td>
							<td className={`${bodyCell} ${correctionCell}`}>
								{returnRecord.correction ? (
									<span
										role="img"
										aria-label="Korekta wystawiona"
										title={formatCorrectionTitle(returnRecord.correction)}
										className={correctionIssued}
									>
										<FileCheck2 aria-hidden="true" className="size-4" />
									</span>
								) : (
									<span
										role="img"
										aria-label="Brak korekty"
										title="Brak korekty"
										className={correctionMissing}
									>
										<FileCheck2 aria-hidden="true" className="size-4" />
									</span>
								)}
							</td>
							<td className={`${bodyCell} ${quantityCell}`}>
								{formatQuantities(returnRecord)}
							</td>
							<td className={`${bodyCell} ${noteCell}`}>
								{returnRecord.receivedBy.id === null && (
									<span className={importMark}>Import</span>
								)}{' '}
								{returnRecord.note}
							</td>
							<td className={bodyCell}>
								<Link
									href={`/returns/${returnRecord.id}${toReturnsListSearch(listScope)}`}
									className={detailsLink}
								>
									Szczegóły
									<span className="sr-only">
										{' '}
										zwrotu zamówienia {returnRecord.orderId}
									</span>
								</Link>
							</td>
						</Reveal>
					))}
				</tbody>
			</table>
		</div>
	);
}

function formatCorrectionTitle({ at, byName }: ReturnCorrection): string {
	const title = `Korekta wystawiona ${formatWarsawDateTime(at)}`;

	return byName ? `${title}, ${byName}` : title;
}

function formatQuantities({ items }: ReturnRecord): string {
	const received = items.reduce((sum, item) => sum + item.quantityReceived, 0);
	const ordered = items.reduce((sum, item) => sum + item.quantityOrdered, 0);

	return `${received} / ${ordered}`;
}
