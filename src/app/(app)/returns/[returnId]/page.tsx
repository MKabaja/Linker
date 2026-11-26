import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DuplicateReturnAlert } from '@/features/returns/components/duplicate-return-alert';
import { ReturnEditor } from '@/features/returns/components/return-editor';
import { ReturnHeader } from '@/features/returns/components/return-header';
import { ReturnHistory } from '@/features/returns/components/return-history';
import { ReturnPackages } from '@/features/returns/components/return-packages';
import { buttonVariants } from '@/shared/components/button';
import { requireUser } from '@/features/auth/server/services/current-user.service';
import type { OrderDetailsResult } from '@/features/returns/model/returns.types';
import {
	returnPageParamsSchema,
	returnPageSearchParamsSchema,
} from '@/features/returns/model/returns-page.schemas';
import { getOrderDetails } from '@/features/returns/server/services/order-details.service';
import { getReturn } from '@/features/returns/server/services/returns.service';
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

	const orderDetails = await getOrderDetails(returnDetails.orderId, new Date());

	return (
		<section className="mx-auto flex w-full max-w-4xl flex-col gap-6 pt-4">
			{duplicate && (
				<DuplicateReturnAlert
					receivedAtLabel={formatWarsawDateTime(returnDetails.createdAt)}
					receivedByName={returnDetails.receivedBy.name}
				/>
			)}
			<ReturnHeader
				orderId={returnDetails.orderId}
				source={returnDetails.source}
				statusLabel={getStatusLabel(orderDetails)}
				dateLabel={formatWarsawDateTime(returnDetails.createdAt)}
			/>
			<Link
				href="/returns/scan"
				className={buttonVariants({
					size: 'lg',
					className: 'h-14 w-full text-base font-semibold',
				})}
			>
				Skanuj następną
			</Link>
			<ReturnPackages orderDetails={orderDetails} />
			<ReturnEditor
				returnId={returnDetails.id}
				note={returnDetails.note}
				items={returnDetails.items}
			/>
			<ReturnHistory events={returnDetails.events} />
		</section>
	);
}

function getStatusLabel(orderDetails: OrderDetailsResult): string {
	return orderDetails.status === 'found' ? orderDetails.order.statusName : '—';
}
