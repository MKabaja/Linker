'use client';

import { Button } from '@/shared/components/button';

type ReturnsErrorProps = { reset: () => void };

export default function ReturnsError({ reset }: ReturnsErrorProps) {
	return (
		<section role="alert" className="flex flex-col items-start gap-4 pt-4">
			<h1 className="text-2xl font-bold">Coś poszło nie tak</h1>
			<p className="text-dim">Nie udało się wyświetlić zwrotów.</p>
			<Button variant="outline" onClick={reset}>
				Spróbuj ponownie
			</Button>
		</section>
	);
}
