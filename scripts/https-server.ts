import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import next from 'next';
import { listLanAddresses } from './lan-addresses';
import { LAN_CERT_PATH, LAN_KEY_PATH, LAN_PORT } from './lan-cert.constants';

main();

async function main() {
	const app = next({ dev: false });
	const handle = app.getRequestHandler();
	await app.prepare();

	const server = createServer(
		{ key: readFileSync(LAN_KEY_PATH), cert: readFileSync(LAN_CERT_PATH) },
		(request, response) => handle(request, response),
	);

	server.on('error', handleServerError);
	server.listen(LAN_PORT, '0.0.0.0', printAddresses);
}

function handleServerError(error: NodeJS.ErrnoException) {
	if (error.code === 'EADDRINUSE') {
		console.error(
			`Port ${LAN_PORT} jest zajęty. Zamknij poprzedni serwer Linkera i uruchom ponownie.`,
		);
	} else {
		console.error(error);
	}
	process.exit(1);
}

function printAddresses() {
	console.log(`Linker (produkcja): https://localhost:${LAN_PORT}`);
	for (const address of listLanAddresses()) {
		console.log(`Telefon: https://${address}:${LAN_PORT}`);
	}
}
