import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { listLanAddresses } from './lan-addresses';
import { LAN_CERT_PATH, LAN_KEY_PATH } from './lan-cert.constants';

const CERT_DIRECTORY = 'certificates';
const STAMP_PATH = `${CERT_DIRECTORY}/lan-ips.txt`;
const VALIDITY_DAYS = '825';
const OPENSSL_CANDIDATES = [
	'openssl',
	'C:/Program Files/Git/usr/bin/openssl.exe',
	'C:/Program Files/Git/mingw64/bin/openssl.exe',
];

main();

function main() {
	const ips = ['127.0.0.1', ...listLanAddresses()];
	const stamp = ips.join(',');
	const isForced = process.argv.includes('--force');

	if (!isForced && isCertFresh(stamp)) {
		return;
	}

	const openssl = findOpenssl();
	if (!openssl) {
		console.error(
			'Brak openssl. Zainstaluj Git for Windows (zawiera openssl).',
		);
		process.exit(1);
	}

	mkdirSync(CERT_DIRECTORY, { recursive: true });
	execFileSync(openssl, buildOpensslArguments(ips), { stdio: 'ignore' });
	writeFileSync(STAMP_PATH, stamp);
	console.log(`Nowy certyfikat HTTPS dla: ${ips.join(', ')}`);
}

function isCertFresh(stamp: string): boolean {
	return (
		existsSync(LAN_CERT_PATH) &&
		existsSync(LAN_KEY_PATH) &&
		existsSync(STAMP_PATH) &&
		readFileSync(STAMP_PATH, 'utf8') === stamp
	);
}

function findOpenssl(): string | undefined {
	return OPENSSL_CANDIDATES.find(canRun);
}

function canRun(command: string): boolean {
	try {
		execFileSync(command, ['version'], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

function buildOpensslArguments(ips: string[]): string[] {
	const subjectAltName = ['DNS:localhost', ...ips.map((ip) => `IP:${ip}`)].join(
		',',
	);

	return [
		'req',
		'-x509',
		'-newkey',
		'rsa:2048',
		'-nodes',
		'-sha256',
		'-days',
		VALIDITY_DAYS,
		'-keyout',
		LAN_KEY_PATH,
		'-out',
		LAN_CERT_PATH,
		'-subj',
		'/CN=linker-lan',
		'-addext',
		`subjectAltName=${subjectAltName}`,
	];
}
