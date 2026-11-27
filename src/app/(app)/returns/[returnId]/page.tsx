import { notFound } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';
import { DeletedReturnBanner } from '@/features/returns/components/deleted-return-banner';
import { DuplicateReturnAlert } from '@/features/returns/components/duplicate-return-alert';
import { ReturnCorrection } from '@/features/returns/components/return-correction';
import { ReturnCustomer } from '@/features/returns/components/return-customer';
import {
	ReturnDeleteButton,
	ReturnEditor,
	ReturnNoteForm,
} from '@/features/returns/components/return-editor';
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
import { getReturnItemImageUrls } from '@/features/returns/server/services/return-item-images.service';
import {
	getReturn,
	getReturnNeighbors,
} from '@/features/returns/server/services/returns.service';
import { carrierLabelByCarrier } from '@/features/returns/utils/carrier';
import { describeReturnMatch } from '@/features/returns/utils/return-match';
import { toReturnsListSearch } from '@/features/returns/utils/returns-list-query';
import { formatWarsawDateTime } from '@/shared/lib/warsaw-time';
import { returnPageStyles } from './return-page.styles';

type EditableSectionProps = { isDisabled: boolean; children: ReactNode };

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

	const imageUrlByItemIdPromise = getReturnItemImageUrls({
		orderId: returnDetails.orderId,
		items: returnDetails.items,
	});

	const [orderDetails, neighbors] = await Promise.all([
		getOrderDetails(returnDetails.orderId, new Date()),
		getReturnNeighbors(returnDetails.id, listScope),
	]);
	const { deletion, correction } = returnDetails;
	const isDeleted = deletion !== null;
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
					carrierLabel={
						returnMatch.carrier
							? carrierLabelByCarrier[returnMatch.carrier]
							: null
					}
					source={returnDetails.source}
					statusLabel={getStatusLabel(orderDetails)}
					receivedLabel={`Przyjęto ${formatWarsawDateTime(returnDetails.createdAt)} · ${returnDetails.receivedBy.name}`}
				/>
				<div className={returnPageStyles.columns}>
					<div className={returnPageStyles.column}>
						<Reveal order={1} className={returnPageStyles.items}>
							<EditableSection isDisabled={isDeleted}>
								<ReturnEditor
									returnId={returnDetails.id}
									items={returnDetails.items}
									imageUrlByItemIdPromise={imageUrlByItemIdPromise}
								/>
							</EditableSection>
						</Reveal>
						<Reveal order={2} className={returnPageStyles.note}>
							<EditableSection isDisabled={isDeleted}>
								<ReturnNoteForm
									returnId={returnDetails.id}
									note={returnDetails.note}
								/>
							</EditableSection>
						</Reveal>
						<Reveal order={9} className={returnPageStyles.delete}>
							<EditableSection isDisabled={isDeleted}>
								<ReturnDeleteButton returnId={returnDetails.id} />
							</EditableSection>
						</Reveal>
					</div>
					<div className={returnPageStyles.column}>
						<Reveal order={1} className={returnPageStyles.correction}>
							<ReturnInfoSection title="Korekta">
								<ReturnWapro
									wmsCode={returnDetails.wmsCode}
									waproOrderNumber={returnDetails.waproOrderNumber}
								/>
								<ReturnCorrection
									returnId={returnDetails.id}
									isIssued={correction !== null}
									isDisabled={isDeleted}
									issuedLabel={correction && formatCorrectionLabel(correction)}
								/>
							</ReturnInfoSection>
						</Reveal>
						<Reveal order={2} className={returnPageStyles.match}>
							<ReturnMatch match={returnMatch} />
						</Reveal>
						<Reveal order={3} className={returnPageStyles.packages}>
							<ReturnPackages orderDetails={orderDetails} />
						</Reveal>
						<Suspense fallback={<LiveSectionsSkeleton />}>
							<LiveSections orderId={returnDetails.orderId} />
						</Suspense>
						<Reveal order={6} className={returnPageStyles.history}>
							<ReturnHistory events={returnDetails.events} />
						</Reveal>
					</div>
				</div>
				<ScanNextLink />
			</PageContent>
		</Reveal>
	);
}

function EditableSection({ isDisabled, children }: EditableSectionProps) {
	return (
		<fieldset disabled={isDisabled} className={returnPageStyles.editable}>
			{children}
		</fieldset>
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
			<Reveal order={4} className={returnPageStyles.customer}>
				<ReturnCustomer result={result} />
			</Reveal>
			<Reveal order={5} className={returnPageStyles.shipping}>
				<ReturnShipping result={result} />
			</Reveal>
		</>
	);
}

function LiveSectionsSkeleton() {
	return (
		<>
			<Skeleton
				aria-busy="true"
				className={`${returnPageStyles.customer} h-40 w-full`}
			/>
			<Skeleton
				aria-busy="true"
				className={`${returnPageStyles.shipping} h-24 w-full`}
			/>
		</>
	);
}
