import { type SubmitEvent, useState } from 'react';
import { Input } from '@/shared/components/input';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/shared/components/sheet';
import { scannerSheetStyles } from './returns-scanner.styles';

type ScannerManualEntrySheetProps = {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	/** Zwraca komunikat dla użytkownika albo pusty tekst, gdy panel ma się zamknąć. */
	onSubmit: (text: string) => Promise<string>;
};

/**
 * Panel ręcznego wpisu numeru paczki, zamówienia, ID zewnętrznego albo telefonu.
 * Gdy jest otwarty, pętle skanera są wstrzymane (decyduje o tym rodzic).
 */
export function ScannerManualEntrySheet({
	isOpen,
	onOpenChange,
	onSubmit,
}: ScannerManualEntrySheetProps) {
	const { content, form, input, note, submit } = scannerSheetStyles;
	const [value, setValue] = useState('');
	const [message, setMessage] = useState('');
	const [isSearching, setIsSearching] = useState(false);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSearching(true);
		setMessage('Szukam…');
		setMessage(await onSubmit(value.trim()));
		setIsSearching(false);
	}

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className={content}>
				<SheetHeader>
					<SheetTitle>Wpisz numer</SheetTitle>
					<SheetDescription>
						Numer paczki, zamówienia, ID zewnętrzne albo telefon.
					</SheetDescription>
				</SheetHeader>
				<form className={form} onSubmit={handleSubmit}>
					<Input
						className={input}
						value={value}
						onChange={(event) => setValue(event.target.value)}
						aria-label="Numer do wyszukania"
						inputMode="text"
						autoComplete="off"
						enterKeyHint="search"
					/>
					{message && (
						<p className={note} role="status">
							{message}
						</p>
					)}
					<button type="submit" className={submit} disabled={isSearching}>
						Szukaj
					</button>
				</form>
			</SheetContent>
		</Sheet>
	);
}
