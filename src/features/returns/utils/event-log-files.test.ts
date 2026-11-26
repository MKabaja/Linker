import { describe, expect, it } from 'vitest';
import {
	groupLinesByDay,
	selectExpiredLogFiles,
} from '@/features/returns/utils/event-log-files';

const options = { appVersion: 'abc1234', isOcrTextLogged: true };

describe('groupLinesByDay', () => {
	it('dzieli zdarzenia na dni według czasu w Warszawie', () => {
		const lines = groupLinesByDay(
			[
				{
					at: new Date('2026-11-25T23:30:00Z'),
					event: { type: 'auth.logout' },
				},
				{
					at: new Date('2026-11-25T21:30:00Z'),
					event: { type: 'auth.logout' },
				},
			],
			options,
		);

		expect([...lines.keys()].sort()).toEqual(['2026-11-25', '2026-11-26']);
	});

	it('zapisuje wersję formatu, czas i wersję aplikacji w jednej linii JSON', () => {
		const lines = groupLinesByDay(
			[
				{
					at: new Date('2026-11-26T10:00:00Z'),
					event: { type: 'return.deleted', returnId: 7, userId: 2 },
				},
			],
			options,
		);

		const [text] = [...lines.values()];
		expect(text?.endsWith('\n')).toBe(true);
		expect(JSON.parse(text ?? '')).toEqual({
			v: 1,
			at: '2026-11-26T10:00:00.000Z',
			type: 'return.deleted',
			returnId: 7,
			userId: 2,
			appVersion: 'abc1234',
		});
	});

	it('usuwa surowy tekst odczytu, gdy przełącznik jest wyłączony', () => {
		const lines = groupLinesByDay(
			[
				{
					at: new Date('2026-11-26T10:00:00Z'),
					event: {
						type: 'scan.read',
						kind: 'package',
						source: 'rapid',
						pattern: '6209__',
						text: 'Jan Kowalski 6209',
					},
				},
			],
			{ appVersion: null, isOcrTextLogged: false },
		);

		const [text] = [...lines.values()];
		expect(text).not.toContain('Kowalski');
		expect(JSON.parse(text ?? '')).toMatchObject({ pattern: '6209__' });
	});
});

describe('selectExpiredLogFiles', () => {
	it('wybiera tylko pliki dziennika starsze niż okres retencji', () => {
		const expired = selectExpiredLogFiles({
			fileNames: [
				'2026-10-26.jsonl',
				'2026-10-27.jsonl',
				'2026-11-26.jsonl',
				'notatki.txt',
				'2020-01-01.log',
			],
			todayKey: '2026-11-26',
			retentionDays: 30,
		});

		expect(expired).toEqual(['2026-10-26.jsonl']);
	});
});
