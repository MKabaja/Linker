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
import {
	correctionPillVariants,
	returnsDayTableStyles,
} from './returns-day-table.styles';

type ReturnsDayTableProps = {
	returns: ReturnRecord[];
	/** Zakres listy; trafia do linków szczegółów, żeby szczegół szedł w tej samej kolejności. */
	listScope: ReturnsListScope;
};

type CorrectionCellProps = { correction: ReturnCorrection | null };

const columnLabels = [
	'Godzina',
	'Zamówienie',
	'Rodzaj',
	'Sztuki',
	'Korekta',
	'ZO',
	'WMS',
	'Źródło',
	'Notatka',
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
		rowLink,
		interactive,
		codeCell,
		quantityCell,
		correctionCell,
		noteCell,
		importMark,
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
								<Link
									href={`/returns/${returnRecord.id}${toReturnsListSearch(listScope)}`}
									className={rowLink}
								>
									{formatWarsawTime(returnRecord.createdAt)}
									<span className="sr-only">
										, szczegóły zwrotu zamówienia {returnRecord.orderId}
									</span>
								</Link>
							</td>
							<td className={bodyCell}>
								<span className={interactive}>
									<BaseLinkerOrderLink orderId={returnRecord.orderId} />
								</span>
							</td>
							<td className={bodyCell}>
								<ReturnKindChip kind={returnRecord.kind} />
							</td>
							<td className={`${bodyCell} ${quantityCell}`}>
								{formatQuantities(returnRecord)}
							</td>
							<td className={`${bodyCell} ${correctionCell}`}>
								<CorrectionPill correction={returnRecord.correction} />
							</td>
							<td className={`${bodyCell} ${codeCell}`}>
								<span className={interactive}>
									<CopyableOrderValue
										label="numer ZO"
										value={returnRecord.waproOrderNumber}
									/>
								</span>
							</td>
							<td className={`${bodyCell} ${codeCell}`}>
								<span className={interactive}>
									<CopyableOrderValue
										label="kod WMS"
										value={returnRecord.wmsCode}
										variant="mono"
									/>
								</span>
							</td>
							<td className={bodyCell}>{returnRecord.source}</td>
							<td
								className={`${bodyCell} ${noteCell}`}
								title={returnRecord.note || undefined}
							>
								{returnRecord.receivedBy.id === null && (
									<span className={importMark}>Import</span>
								)}{' '}
								{returnRecord.note}
							</td>
						</Reveal>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CorrectionPill({ correction }: CorrectionCellProps) {
	if (!correction) {
		return (
			<span
				role="img"
				aria-label="Brak korekty"
				className={correctionPillVariants({ state: 'missing' })}
			>
				Brak
			</span>
		);
	}

	const title = formatCorrectionTitle(correction);

	return (
		<span
			role="img"
			aria-label={title}
			title={title}
			className={correctionPillVariants({ state: 'issued' })}
		>
			Wystawiona
		</span>
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
