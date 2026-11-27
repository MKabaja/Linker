'use client';

import { Button } from '@/shared/components/button';
import { PageContent } from '@/shared/components/page-content';
import { PageHeader } from '@/shared/components/page-header';

type ReturnsErrorProps = { reset: () => void };

export default function ReturnsError({ reset }: ReturnsErrorProps) {
	return (
		<section role="alert">
			<PageHeader title="Coś poszło nie tak" />
			<PageContent className="items-start">
				<p className="text-dim">Nie udało się wyświetlić zwrotów.</p>
				<Button variant="outline" onClick={reset}>
					Spróbuj ponownie
				</Button>
			</PageContent>
		</section>
	);
}
