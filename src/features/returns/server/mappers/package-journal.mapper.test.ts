import { describe, expect, it } from 'vitest';
import {
	getNextJournalCursor,
	parseJournalCursor,
	selectOrderIdsWithPackageChanges,
	selectOrderIdsWithPackageDeletions,
	shouldReplacePackages,
} from '@/features/returns/server/mappers/package-journal.mapper';

const logs = [
	{ log_id: 101, log_type: 9, order_id: 357769987 },
	{ log_id: 102, log_type: 9, order_id: 356095152 },
	{ log_id: 103, log_type: 10, order_id: 357769987 },
	{ log_id: 104, log_type: 3, order_id: 111 },
	{ log_id: 105, log_type: 9, order_id: 0 },
];

describe('selectOrderIdsWithPackageChanges', () => {
	it('zwraca zamówienia z utworzonymi i usuniętymi paczkami bez powtórzeń', () => {
		expect(selectOrderIdsWithPackageChanges(logs)).toEqual([
			357769987, 356095152,
		]);
	});

	it('dla pustego dziennika zwraca pustą listę', () => {
		expect(selectOrderIdsWithPackageChanges([])).toEqual([]);
	});
});

describe('getNextJournalCursor', () => {
	it('ustawia kursor o jeden za największym log_id', () => {
		expect(getNextJournalCursor(logs, 1)).toBe(106);
	});

	it('bez wpisów zostawia dotychczasowy kursor', () => {
		expect(getNextJournalCursor([], 50)).toBe(50);
	});
});

describe('parseJournalCursor', () => {
	it('brak, zero i śmieci dają początek dziennika', () => {
		expect(parseJournalCursor(null)).toBe(1);
		expect(parseJournalCursor('0')).toBe(1);
		expect(parseJournalCursor('abc')).toBe(1);
	});

	it('poprawny zapis jest odczytywany', () => {
		expect(parseJournalCursor('4521')).toBe(4521);
	});
});

describe('selectOrderIdsWithPackageDeletions', () => {
	it('zwraca tylko zamówienia z wpisem typu 10', () => {
		expect(selectOrderIdsWithPackageDeletions(logs)).toEqual(
			new Set([357769987]),
		);
	});
});

describe('shouldReplacePackages', () => {
	it('niepusta lista paczek zawsze zastępuje dotychczasowe', () => {
		expect(
			shouldReplacePackages({ packageCount: 2, hasDeletionLog: false }),
		).toBe(true);
	});

	it('pusta lista zastępuje tylko przy potwierdzonym usunięciu', () => {
		expect(
			shouldReplacePackages({ packageCount: 0, hasDeletionLog: true }),
		).toBe(true);
		expect(
			shouldReplacePackages({ packageCount: 0, hasDeletionLog: false }),
		).toBe(false);
	});
});
