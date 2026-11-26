import { type SubmitEvent, useState, useTransition } from 'react';
import { Button } from '@/shared/components/button';
import { RETURN_NOTE_MAX_LENGTH } from '@/features/returns/model/returns.constants';
import { saveReturnChanges } from './return-editor.save';
import { returnNoteFormStyles } from './return-editor.styles';

type ReturnNoteFormProps = { returnId: number; note: string };

type NoteStatus =
	| { type: 'idle' }
	| { type: 'saved' }
	| { type: 'error'; message: string };

export function ReturnNoteForm({ returnId, note }: ReturnNoteFormProps) {
	const { form, label, textarea, footer, status } = returnNoteFormStyles;
	const [draft, setDraft] = useState(note);
	const [noteStatus, setNoteStatus] = useState<NoteStatus>({ type: 'idle' });
	const [isSaving, startTransition] = useTransition();
	const isChanged = draft.trim() !== note;

	function saveNote(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		startTransition(async () => {
			const message = await saveReturnChanges({ returnId, note: draft });
			setNoteStatus(message ? { type: 'error', message } : { type: 'saved' });
		});
	}

	return (
		<form className={form} onSubmit={saveNote}>
			<label htmlFor="return-note" className={label}>
				Notatka
			</label>
			<textarea
				id="return-note"
				className={`field ${textarea}`}
				maxLength={RETURN_NOTE_MAX_LENGTH}
				value={draft}
				onChange={(event) => {
					setDraft(event.target.value);
					setNoteStatus({ type: 'idle' });
				}}
			/>
			<div className={footer}>
				<Button type="submit" disabled={!isChanged || isSaving}>
					Zapisz notatkę
				</Button>
				<span role="status" className={status}>
					{noteStatus.type === 'saved' && 'Zapisano'}
					{noteStatus.type === 'error' && noteStatus.message}
				</span>
			</div>
		</form>
	);
}
