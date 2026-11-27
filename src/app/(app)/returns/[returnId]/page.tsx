import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { DeletedReturnBanner } from '@/features/returns/components/deleted-return-banner';
import { DuplicateReturnAlert } from '@/features/returns/components/duplicate-return-alert';
import { ReturnCorrection } from '@/features/returns/components/return-correction';
import { ReturnCustomer } from '@/features/returns/components/return-customer';
import { ReturnEditor } from '@/features/returns/components/return-editor';
import { ReturnHeader } from '@/features/returns/components/return-header';
import { ReturnHistory } from '@/features/returns/components/return-history';
import { ReturnInfoSection } from '@/features/returns/components/return-info-section';
import { ReturnMatch } from '@/features/returns/components/return-match';
import { ReturnNavigation } from '@/features/returns/components/return-navigation';
import { ReturnPackages } from '@/features/returns/components/return-packages';
import { ReturnShipping } from '@/features/returns/components/return-shipping';
import { ReturnWapro } from '@/features/returns/components/return-wapro';
import { ScanNextLink } from '@/features/returns/components/scan-next-link';
import { KeepScreenAwake } from '@/shared/components/keep-screen-awake';
import { PageContent } from '@/shared/components/page-content';
import { Reveal } from '@/shared/components/reveal';
import { Skeleton } from '@/shared/components/skeleton';
import { requireUser } from '@/features/auth/server/services/current-user.service';
import type {
	OrderDetailsResult,
	ReturnCorrection as ReturnCorrectionRecord,
} from '@/features/returns/model/returns.types';
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
import { describeReturnMatch } from '@/features/returns/utils/return-match';
import { toReturnsListSearch } from '@/features/returns/utils/returns-list-query';
import { formatWarsawDateTime } from '@/shared/lib/warsaw-time';

export default async function ReturnPage(
	props: PageProps<'/returns/[returnId]'>,
) {
	await requireUser();
	const parsedParams = returnPageParamsSchema.safeParse(await props.params);

	if (!parsedParams.success) {
		notFound();
	}

	const { duplicate, ...listScope } = returnPageSearchParamsSchema.parse(
		await props.searchParams,
	);
	const returnDetails = await getReturn(parsedParams.data.returnId);

	if (!returnDetails) {
		notFound();
	}

	const [orderDetails, neighbors] = await Promise.all([
		getOrderDetails(returnDetails.orderId, new Date()),
		getReturnNeighbors(returnDetails.id, listScope),
	]);
	const { deletion, correction } = returnDetails;
	const returnMatch = describeReturnMatch({
		matchedBy: returnDetails.matchedBy,
		scannedLabel: returnDetails.scannedLabel,
		packages:
			orderDetails.status === 'found' ? orderDetails.order.packages : [],
	});

	return (
		<Reveal as="section">
			<KeepScreenAwake />
			<PageContent className="w-full">
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
				<ReturnNavigation
					{...neighbors}
					listSearch={toReturnsListSearch(listScope)}
				/>
				<ReturnHeader
					orderId={returnDetails.orderId}
					source={returnDetails.source}
					statusLabel={getStatusLabel(orderDetails)}
					dateLabel={formatWarsawDateTime(returnDetails.createdAt)}
				/>
				<ScanNextLink />
				<div className="grid items-start gap-6 lg:grid-cols-2">
					<div className="flex flex-col gap-6">
						<Reveal order={1}>
							<ReturnMatch match={returnMatch} />
						</Reveal>
						<Reveal order={2}>
							<ReturnWapro
								wmsCode={returnDetails.wmsCode}
								waproOrderNumber={returnDetails.waproOrderNumber}
							/>
						</Reveal>
						<Reveal order={3}>
							<ReturnPackages orderDetails={orderDetails} />
						</Reveal>
						<Suspense fallback={<LiveSectionsSkeleton />}>
							<LiveSections orderId={returnDetails.orderId} />
						</Suspense>
					</div>
					<div className="flex flex-col gap-6">
						<fieldset disabled={deletion !== null} className="contents">
							<Reveal order={2}>
								<ReturnInfoSection title="Korekta">
									<ReturnCorrection
										returnId={returnDetails.id}
										isIssued={correction !== null}
										issuedLabel={
											correction && formatCorrectionLabel(correction)
										}
									/>
								</ReturnInfoSection>
							</Reveal>
							<Reveal order={3}>
								<ReturnEditor
									returnId={returnDetails.id}
									note={returnDetails.note}
									items={returnDetails.items}
								/>
							</Reveal>
						</fieldset>
					</div>
				</div>
				<Reveal order={4}>
					<ReturnHistory events={returnDetails.events} />
				</Reveal>
			</PageContent>
		</Reveal>
	);
}

function getStatusLabel(orderDetails: OrderDetailsResult): string {
	return orderDetails.status === 'found' ? orderDetails.order.statusName : '—';
}

function formatCorrectionLabel({ at, byName }: ReturnCorrectionRecord): string {
	const issuedAtLabel = formatWarsawDateTime(at);

	return byName
		? `Wystawiono ${issuedAtLabel}, ${byName}`
		: `Wystawiono ${issuedAtLabel}`;
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
