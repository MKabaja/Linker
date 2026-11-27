import { matchedByLabelByMatchedBy } from '@/features/returns/model/returns.constants';
import { carrierLabelByCarrier } from '@/features/returns/utils/carrier';
import type {
	PackageMatch,
	ReturnMatch as ReturnMatchView,
} from '@/features/returns/utils/return-match';
import {
	returnMatchBadgeVariants,
	returnMatchStyles,
} from './return-match.styles';

type ReturnMatchProps = { match: ReturnMatchView };

type PackageMatchBadge = { label: string; tone: 'success' | 'accent' };

type PackageMatchBadgeByKind = Record<
	Exclude<PackageMatch['kind'], 'none'>,
	PackageMatchBadge
>;

const packageMatchBadgeByKind: PackageMatchBadgeByKind = {
	shipping: { label: 'Zgodny z paczką zamówienia', tone: 'success' },
	return: { label: 'Paczka zwrotna', tone: 'accent' },
};

export function ReturnMatch({ match }: ReturnMatchProps) {
	const { section, heading, card, method, label, missing, badges } =
		returnMatchStyles;
	const packageBadge =
		match.packageMatch.kind === 'none'
			? null
			: packageMatchBadgeByKind[match.packageMatch.kind];

	return (
		<section aria-labelledby="return-match-heading" className={section}>
			<h2 id="return-match-heading" className={heading}>
				Po czym znaleziono
			</h2>
			<div className={card}>
				<p className={method}>{matchedByLabelByMatchedBy[match.matchedBy]}</p>
				{match.scannedLabel ? (
					<p className={label}>{match.scannedLabel}</p>
				) : (
					<p className={missing}>Nie zapisano numeru paczki ani etykiety.</p>
				)}
				{(match.carrier || packageBadge) && (
					<div className={badges}>
						{match.carrier && (
							<span className={returnMatchBadgeVariants({ tone: 'info' })}>
								{carrierLabelByCarrier[match.carrier]}
							</span>
						)}
						{packageBadge && (
							<span
								className={returnMatchBadgeVariants({
									tone: packageBadge.tone,
								})}
							>
								{packageBadge.label}
							</span>
						)}
					</div>
				)}
			</div>
		</section>
	);
}
