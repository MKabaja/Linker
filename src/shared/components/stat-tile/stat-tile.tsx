import { statTileStyles } from './stat-tile.styles';

type StatTileProps = {
	label: string;
	value: string | number;
	hint?: string;
};

export function StatTile({ label, value, hint }: StatTileProps) {
	const { tile, labelText, valueText, hintText } = statTileStyles;

	return (
		<div className={tile}>
			<dt className={labelText}>{label}</dt>
			<dd className={valueText}>{value}</dd>
			{hint && <dd className={hintText}>{hint}</dd>}
		</div>
	);
}
