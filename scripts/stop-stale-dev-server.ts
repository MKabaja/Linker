import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const PROJECT_PATH = process.cwd().toLowerCase();
const LOCK_PATH = path.join(process.cwd(), '.next', 'dev', 'lock');

const devLockSchema = z.object({ pid: z.number().int().positive() });

main();

function main() {
	const serverPid = readLockedPid();
	if (!serverPid || !isProjectNextProcess(serverPid)) {
		return;
	}

	const parentPid = readParentPid(serverPid);
	const rootPid =
		parentPid && isProjectNextProcess(parentPid) ? parentPid : serverPid;

	stopProcessTree(rootPid);
	console.log(`Zatrzymano poprzedni serwer dev Linkera (PID ${rootPid}).`);
}

function readLockedPid(): number | undefined {
	try {
		const lock = devLockSchema.parse(
			JSON.parse(readFileSync(LOCK_PATH, 'utf8')),
		);
		return lock.pid;
	} catch {
		return undefined;
	}
}

function isProjectNextProcess(pid: number): boolean {
	const commandLine = readProcessField(pid, 'CommandLine').toLowerCase();
	return commandLine.includes(PROJECT_PATH) && commandLine.includes('next');
}

function readParentPid(pid: number): number | undefined {
	const parentPid = Number(readProcessField(pid, 'ParentProcessId'));
	return Number.isInteger(parentPid) && parentPid > 0 ? parentPid : undefined;
}

function readProcessField(
	pid: number,
	field: 'CommandLine' | 'ParentProcessId',
): string {
	try {
		if (process.platform === 'win32') {
			return execFileSync(
				'powershell.exe',
				[
					'-NoProfile',
					'-Command',
					`(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").${field}`,
				],
				{ encoding: 'utf8' },
			).trim();
		}
		return field === 'CommandLine'
			? readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll('\0', ' ')
			: readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')[1];
	} catch {
		return '';
	}
}

function stopProcessTree(pid: number) {
	if (process.platform === 'win32') {
		execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
			stdio: 'ignore',
		});
		return;
	}
	process.kill(pid, 'SIGTERM');
}
