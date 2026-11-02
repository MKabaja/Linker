import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const hookInput = JSON.parse(readFileSync(0, 'utf8'));
const editedFilePath = hookInput.tool_input?.file_path;

if (editedFilePath) {
	const biomeEntryPath = join(
		hookInput.cwd,
		'node_modules',
		'@biomejs',
		'biome',
		'bin',
		'biome',
	);
	const biomeResult = spawnSync(
		process.execPath,
		[
			biomeEntryPath,
			'check',
			'--write',
			'--no-errors-on-unmatched',
			'--files-ignore-unknown=true',
			editedFilePath,
		],
		{ cwd: hookInput.cwd, encoding: 'utf8' },
	);

	if (biomeResult.status !== 0) {
		process.stderr.write(`${biomeResult.stdout}${biomeResult.stderr}`);
		process.exit(2);
	}
}
