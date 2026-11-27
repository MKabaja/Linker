export async function register() {
	if (
		process.env.NEXT_RUNTIME !== 'nodejs' ||
		process.env.NEXT_PHASE === 'phase-production-build'
	) {
		return;
	}

	const { startOrderIndexScheduler } = await import(
		'@/features/returns/server/services/order-index-scheduler.service'
	);
	startOrderIndexScheduler();
}
