import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { demoReturnsFileSchema } from '@/features/returns/model/demo-import.schemas';
import type { DemoImportSummary } from '@/features/returns/server/services/demo-import.service';
import { parseJsonOrNull } from '@/shared/lib/parse-json';

type SummaryLabels = { title: string; imported: string };

const previewLabels: SummaryLabels = {
	title: 'Podgląd (bez zapisu):',
	imported: 'do zaimportowania',
};

const importLabels: SummaryLabels = {
	title: 'Import zakończony:',
	imported: 'zaimportowano',
};

const USAGE =
	'Użycie: npm run returns:import-demo -- <ścieżka do returns.json> [--dry-run]';

main();

async function main() {
	loadEnvConfig(process.cwd());
	const args = process.argv.slice(2);
	const filePath = args.find((arg) => !arg.startsWith('--'));
	const isDryRun = args.includes('--dry-run');

	if (!filePath) {
		console.error(USAGE);
		process.exit(1);
	}

	const parsedFile = demoReturnsFileSchema.safeParse(
		parseJsonOrNull(await readFile(resolve(filePath), 'utf8')),
	);

	if (!parsedFile.success) {
		console.error('Plik nie jest tablicą ani obiektem zwrotów w JSON.');
		process.exit(1);
	}

	const { importDemoReturns, previewDemoImport } = await import(
		'@/features/returns/server/services/demo-import.service'
	);
	const summary = isDryRun
		? await previewDemoImport(parsedFile.data)
		: await importDemoReturns(parsedFile.data);

	printSummary(summary, isDryRun ? previewLabels : importLabels);
	process.exit(0);
}

function printSummary(summary: DemoImportSummary, labels: SummaryLabels): void {
	console.log(labels.title);
	console.log(`  rekordów w pliku: ${summary.total}`);
	console.log(`  niepoprawnych (pominięte): ${summary.invalid}`);
	console.log(`  już były w bazie: ${summary.alreadyExisting}`);
	console.log(`  ${labels.imported}: ${summary.imported}`);
}
