import { type SubmitEvent, useRef, useState } from 'react';
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
	onOpenPendingReturns: () => void;
};

/**
 * Panel ręcznego wpisu numeru paczki, zamówienia, ID zewnętrznego albo telefonu.
 * Gdy jest otwarty, pętle skanera są wstrzymane (decyduje o tym rodzic).
 */
export function ScannerManualEntrySheet({
	isOpen,
	onOpenChange,
	onSubmit,
	onOpenPendingReturns,
}: ScannerManualEntrySheetProps) {
	const {
		content,
		form,
		input,
		inputRow,
		modeToggle,
		note,
		secondaryAction,
		submit,
	} = scannerSheetStyles;
	const inputRef = useRef<HTMLInputElement>(null);
	const [isTextMode, setIsTextMode] = useState(false);
	const [value, setValue] = useState('');
	const [message, setMessage] = useState('');
	const [isSearching, setIsSearching] = useState(false);

	function toggleInputMode() {
		setIsTextMode((current) => !current);
		inputRef.current?.focus();
	}

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
						Numer paczki (wystarczą ostatnie 4 znaki), kod zwrotu, numer
						zamówienia, ID zewnętrzne albo telefon.
					</SheetDescription>
				</SheetHeader>
				<form className={form} onSubmit={handleSubmit}>
					<div className={inputRow}>
						<Input
							ref={inputRef}
							className={input}
							value={value}
							onChange={(event) => setValue(event.target.value)}
							aria-label="Numer do wyszukania"
							inputMode={isTextMode ? 'text' : 'numeric'}
							pattern={isTextMode ? undefined : '[0-9]*'}
							autoCapitalize={isTextMode ? 'characters' : 'off'}
							autoComplete="off"
							enterKeyHint="search"
						/>
						<button
							type="button"
							className={modeToggle}
							onMouseDown={(event) => event.preventDefault()}
							onClick={toggleInputMode}
							aria-pressed={isTextMode}
							aria-label="Klawiatura z literami"
						>
							{isTextMode ? '123' : 'ABC'}
						</button>
					</div>
					{message && (
						<p className={note} role="status">
							{message}
						</p>
					)}
					<button type="submit" className={submit} disabled={isSearching}>
						Szukaj
					</button>
					<button
						type="button"
						className={secondaryAction}
						onClick={onOpenPendingReturns}
					>
						Oczekujące zwroty Allegro
					</button>
				</form>
			</SheetContent>
		</Sheet>
	);
}
