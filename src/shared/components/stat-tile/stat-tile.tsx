import type { Route } from 'next';
import Link from 'next/link';
import { statTileStyles, statTileVariants } from './stat-tile.styles';

type StatTileProps = {
	label: string;
	value: string | number;
	hint?: string;
	variant?: 'bar' | 'card';
	/** Zamienia kafel w link (cały kafel jest klikalny). */
	href?: Route;
	/** Zaznacza kafel-link jako włączony filtr. */
	isActive?: boolean;
};

export function StatTile({
	label,
	value,
	hint,
	variant = 'bar',
	href,
	isActive = false,
}: StatTileProps) {
	const { labelText, link, valueByVariant, hintText } = statTileStyles;

	return (
		<div className={statTileVariants({ variant, isActive })}>
			<dt className={labelText}>
				{href ? (
					<Link
						href={href}
						aria-current={isActive ? 'page' : undefined}
						className={link}
					>
						{label}
					</Link>
				) : (
					label
				)}
			</dt>
			<dd className={valueByVariant[variant]}>{value}</dd>
			{hint && <dd className={hintText}>{hint}</dd>}
		</div>
	);
}
