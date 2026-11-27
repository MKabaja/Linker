import { loadEnvConfig } from '@next/env';

main();

async function main() {
	loadEnvConfig(process.cwd());
	const { syncOrderIndex, syncPendingPackages } = await import(
		'@/features/returns/server/services/order-index-sync.service'
	);

	const ordersSummary = await syncOrderIndex(new Date());
	console.log('Zamówienia:', JSON.stringify(ordersSummary));

	if (ordersSummary.status === 'ok') {
		const packagesSummary = await syncPendingPackages(new Date());
		console.log('Paczki:', JSON.stringify(packagesSummary));
	}

	process.exit(0);
}
