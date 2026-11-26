import { duplicateReturnAlertStyles } from './duplicate-return-alert.styles';

type DuplicateReturnAlertProps = {
	receivedAtLabel: string;
	receivedByName: string;
	deletion?: { deletedAtLabel: string; deletedByName: string } | null;
};

export function DuplicateReturnAlert({
	receivedAtLabel,
	receivedByName,
	deletion,
}: DuplicateReturnAlertProps) {
	const { alert, title, hint } = duplicateReturnAlertStyles;

	return (
		<div role="alert" className={alert}>
			<p className={title}>
				Ten zwrot był już przyjęty {receivedAtLabel} przez {receivedByName}
				{deletion &&
					` i usunięty ${deletion.deletedAtLabel} przez ${deletion.deletedByName}`}
				{' — '}nie zwracaj pieniędzy ponownie
			</p>
			<p className={hint}>
				{deletion
					? 'Jeśli usunięto go omyłkowo, możesz go przywrócić poniżej.'
					: 'Poniżej widać aktualny stan zwrotu.'}
			</p>
		</div>
	);
}
