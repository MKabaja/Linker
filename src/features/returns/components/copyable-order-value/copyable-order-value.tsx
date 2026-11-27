import { CopyValueButton } from '@/shared/components/copy-value-button';
import { copyableOrderValueStyles } from './copyable-order-value.styles';

type CopyableOrderValueProps = {
	label: string;
	value: string;
	variant?: 'plain' | 'mono';
};

export function CopyableOrderValue({
	label,
	value,
	variant = 'plain',
}: CopyableOrderValueProps) {
	const { empty, valueByVariant } = copyableOrderValueStyles;

	if (!value) {
		return <span className={empty}>—</span>;
	}

	return (
		<CopyValueButton label={label} value={value}>
			<span className={valueByVariant[variant]}>{value}</span>
		</CopyValueButton>
	);
}
