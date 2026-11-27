import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DeletedReturnBanner } from '@/features/returns/components/deleted-return-banner';
import { DuplicateReturnAlert } from '@/features/returns/components/duplicate-return-alert';
import { ReturnCustomer } from '@/features/returns/components/return-customer';
import { ReturnEditor } from '@/features/returns/components/return-editor';
import { ReturnHeader } from '@/features/returns/components/return-header';
import { ReturnHistory } from '@/features/returns/components/return-history';
import { ReturnNavigation } from '@/features/returns/components/return-navigation';
import { ReturnPackages } from '@/features/returns/components/return-packages';
import { ReturnShipping } from '@/features/returns/components/return-shipping';
import { ReturnWapro } from '@/features/returns/components/return-wapro';
import { ScanNextLink } from '@/features/returns/components/scan-next-link';
import { PageContent } from '@/shared/components/page-content';
import { Skeleton } from '@/shared/components/skeleton';
import { requireUser } from '@/features/auth/server/services/current-user.service';
import type { OrderDetailsResult } from '@/features/returns/model/returns.types';
import {
	returnPageParamsSchema,
	returnPageSearchParamsSchema,
} from '@/features/returns/model/returns-page.schemas';
import { getOrderDetails } from '@/features/returns/server/services/order-details.service';
import { getOrderLiveDetails } from '@/features/returns/server/services/order-live-details.service';
import {
	getReturn,
	getReturnNeighbors,
} from '@/features/returns/server/services/returns.service';
import { formatWarsawDateTime } from '@/shared/lib/warsaw-time';

export default async function ReturnPage(
	props: PageProps<'/returns/[returnId]'>,
) {
	await requireUser();
	const parsedParams = returnPageParamsSchema.safeParse(await props.params);

	if (!parsedParams.success) {
		notFound();
	}

	const { duplicate } = returnPageSearchParamsSchema.parse(
		await props.searchParams,
	);
	const returnDetails = await getReturn(parsedParams.data.returnId);

	if (!returnDetails) {
		notFound();
	}

	const [orderDetails, neighbors] = await Promise.all([
		getOrderDetails(returnDetails.orderId, new Date()),
		getReturnNeighbors(returnDetails.id),
	]);
	const { deletion } = returnDetails;

	return (
		<section>
			<PageContent className="mx-auto w-full max-w-4xl">
				{duplicate && (
					<DuplicateReturnAlert
						receivedAtLabel={formatWarsawDateTime(returnDetails.createdAt)}
						receivedByName={returnDetails.receivedBy.name}
						deletion={
							deletion && {
								deletedAtLabel: formatWarsawDateTime(deletion.at),
								deletedByName: deletion.byName,
							}
						}
					/>
				)}
				{deletion && (
					<DeletedReturnBanner
						returnId={returnDetails.id}
						deletedAtLabel={formatWarsawDateTime(deletion.at)}
						deletedByName={deletion.byName}
					/>
				)}
				<ReturnNavigation {...neighbors} />
				<ReturnHeader
					orderId={returnDetails.orderId}
					source={returnDetails.source}
					statusLabel={getStatusLabel(orderDetails)}
					dateLabel={formatWarsawDateTime(returnDetails.createdAt)}
				/>
				<ScanNextLink />
				<ReturnWapro
					wmsCode={returnDetails.wmsCode}
					waproOrderNumber={returnDetails.waproOrderNumber}
				/>
				<ReturnPackages orderDetails={orderDetails} />
				<Suspense fallback={<LiveSectionsSkeleton />}>
					<LiveSections orderId={returnDetails.orderId} />
				</Suspense>
				<fieldset disabled={deletion !== null} className="contents">
					<ReturnEditor
						returnId={returnDetails.id}
						note={returnDetails.note}
						items={returnDetails.items}
					/>
				</fieldset>
				<ReturnHistory events={returnDetails.events} />
			</PageContent>
		</section>
	);
}

function getStatusLabel(orderDetails: OrderDetailsResult): string {
	return orderDetails.status === 'found' ? orderDetails.order.statusName : '—';
}

async function LiveSections({ orderId }: { orderId: number }) {
	const result = await getOrderLiveDetails(orderId, new Date());

	return (
		<>
			<ReturnCustomer result={result} />
			<ReturnShipping result={result} />
		</>
	);
}

function LiveSectionsSkeleton() {
	return (
		<div aria-busy="true" className="flex flex-col gap-6">
			<Skeleton className="h-40 w-full" />
			<Skeleton className="h-24 w-full" />
		</div>
	);
}
