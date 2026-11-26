import { duplicateReturnAlertStyles } from './duplicate-return-alert.styles';

type DuplicateReturnAlertProps = {
	receivedAtLabel: string;
	receivedByName: string;
};

export function DuplicateReturnAlert({
	receivedAtLabel,
	receivedByName,
}: DuplicateReturnAlertProps) {
	const { alert, title, hint } = duplicateReturnAlertStyles;

	return (
		<div role="alert" className={alert}>
			<p className={title}>
				Ten zwrot był już przyjęty {receivedAtLabel} przez {receivedByName}
				{' — '}nie zwracaj pieniędzy ponownie
			</p>
			<p className={hint}>Poniżej widać aktualny stan zwrotu.</p>
		</div>
	);
}
