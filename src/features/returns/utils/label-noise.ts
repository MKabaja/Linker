const NOT_AFTER_NUMBER = '(?<![\\d.,:\\-/])';
const NOT_BEFORE_NUMBER = '(?![.,:\\-/]?\\d)';
const DECIMAL = '\\d{1,4}(?:[.,]\\d{1,2})?';
const SMALL_DECIMAL = '\\d{1,3}(?:[.,]\\d{1,2})?';
const DAY = '(?:0?[1-9]|[12]\\d|3[01])';
const MONTH = '(?:0?[1-9]|1[0-2])';
const SEPARATOR = ' ; ';

const labelNoisePatterns: readonly RegExp[] = [
	`${DECIMAL}\\s?(?:cm|mm|kg|g)\\b`,
	`${SMALL_DECIMAL}\\s*[x×]\\s*${SMALL_DECIMAL}\\s*[x×]\\s*${SMALL_DECIMAL}`,
	`\\d{4}-${MONTH}-${DAY}`,
	`${DAY}([.\\-/])${MONTH}\\1\\d{4}`,
	`${DAY}\\.${MONTH}`,
	'(?:[01]?\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?',
].map(
	(pattern) =>
		new RegExp(`${NOT_AFTER_NUMBER}${pattern}${NOT_BEFORE_NUMBER}`, 'gi'),
);

/**
 * Usuwa z linii etykiety wymiary (`15.10 cm x 37.10 cm`, `15x37x30`), wagę (`1.00 kg`),
 * daty (`24.11.2026`, `2026-11-24`, `24.11`) i godziny (`12:45`), żeby nie sklejały się z numerami.
 *
 * @remarks
 * Fragment liczy się tylko wtedy, gdy nie jest częścią dłuższego ciągu cyfr; zastępuje go separator,
 * który rozdziela sąsiednie grupy cyfr.
 */
export function stripLabelNoise(text: string): string {
	return labelNoisePatterns.reduce(
		(rest, pattern) => rest.replace(pattern, SEPARATOR),
		text,
	);
}
