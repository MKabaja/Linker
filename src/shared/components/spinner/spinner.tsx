import { spinnerStyles } from './spinner.styles';

type SpinnerProps = {
	label: string;
};

export function Spinner({ label }: SpinnerProps) {
	return (
		<output className={spinnerStyles.wrapper}>
			<span aria-hidden="true" className={spinnerStyles.circle} />
			<span className={spinnerStyles.label}>{label}</span>
		</output>
	);
}
