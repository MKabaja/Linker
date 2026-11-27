import { ReturnsDaySummary } from '@/features/returns/components/returns-day-summary';
import { ReturnsDayTable } from '@/features/returns/components/returns-day-table';
import { ReturnsDayToolbar } from '@/features/returns/components/returns-day-toolbar';
import { PageContent } from '@/shared/components/page-content';
import { PageHeader } from '@/shared/components/page-header';
import { Reveal } from '@/shared/components/reveal';
import { requireUser } from '@/features/auth/server/services/current-user.service';
import { returnsListSearchParamsSchema } from '@/features/returns/model/returns-page.schemas';
import { getReturnsOfDay } from '@/features/returns/server/services/returns.service';
import { toWarsawDateKey } from '@/shared/lib/warsaw-time';

export default async function ReturnsPage(props: PageProps<'/returns'>) {
	await requireUser();
	const { date = toWarsawDateKey(new Date()), ...filters } =
		returnsListSearchParamsSchema.parse(await props.searchParams);
	const scope = { ...filters, date };
	const dayReturns = await getReturnsOfDay(scope);

	return (
		<Reveal as="section">
			<PageHeader
				title="Zwroty"
				actions={
					<ReturnsDayToolbar
						scope={scope}
						orderIds={dayReturns.returns.map(({ orderId }) => orderId)}
					/>
				}
			/>
			<ReturnsDaySummary summary={dayReturns.summary} />
			<PageContent>
				<ReturnsDayTable returns={dayReturns.returns} listScope={scope} />
			</PageContent>
		</Reveal>
	);
}
