import { returnKindLabelByKind } from '@/features/returns/model/returns.constants';
import type { ReturnKind } from '@/features/returns/model/returns.types';
import {
	returnKindChipVariants,
	returnKindDotVariants,
} from './return-kind-chip.styles';

type ReturnKindChipProps = { kind: ReturnKind };

export function ReturnKindChip({ kind }: ReturnKindChipProps) {
	return (
		<span className={returnKindChipVariants({ kind })}>
			<span aria-hidden="true" className={returnKindDotVariants({ kind })} />
			{returnKindLabelByKind[kind]}
		</span>
	);
}
