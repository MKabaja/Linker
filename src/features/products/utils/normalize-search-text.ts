export function normalizeSearchText(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/ł/g, 'l')
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/(\d) (ml|g|kg|l|szt)\b/g, '$1$2')
		.trim();
}
