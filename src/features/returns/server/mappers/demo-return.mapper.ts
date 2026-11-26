import 'server-only';
import {
	type DemoReturn,
	demoReturnSchema,
} from '@/features/returns/model/demo-import.schemas';
import type {
	NewReturn,
	NewReturnItem,
} from '@/features/returns/model/new-return.types';

type DemoRecords = {
	records: DemoReturn[];
	/** Pozycje w pliku (od 0) rekordów, które nie przeszły walidacji. */
	invalidIndexes: number[];
};

const ORDER_PRODUCT_ID_PATTERN = /^\d{1,15}$/;

/**
 * Waliduje rekordy pliku demo; niepoprawne pomija i zapamiętuje ich pozycje.
 */
function parseDemoRecords(rawRecords: unknown[]): DemoRecords {
	const records: DemoReturn[] = [];
	const invalidIndexes: number[] = [];

	rawRecords.forEach((rawRecord, index) => {
		const parsed = demoReturnSchema.safeParse(rawRecord);

		if (parsed.success) {
			records.push(parsed.data);
		} else {
			invalidIndexes.push(index);
		}
	});

	return { records, invalidIndexes };
}

/**
 * Zamienia rekord demo na zwrot z importu: bez pracownika, z datami, notatką i ilościami z pliku.
 *
 * @remarks `key` pozycji staje się `order_product_id`, gdy jest liczbą, inaczej `null`.
 */
function toImportedReturn(record: DemoReturn): NewReturn {
	return {
		orderId: record.orderId,
		source: record.source,
		note: record.note,
		receivedBy: null,
		matchedBy: 'imported',
		scannedLabel: null,
		items: record.items.map(toImportedItem),
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

function toImportedItem(
	item: DemoReturn['items'][number],
	position: number,
): NewReturnItem {
	return {
		position,
		orderProductId: ORDER_PRODUCT_ID_PATTERN.test(item.key)
			? Number(item.key)
			: null,
		name: item.name,
		ean: item.ean,
		sku: item.sku,
		quantityOrdered: item.quantityOrdered,
		quantityReceived: item.quantityReceived,
		condition: 'accepted',
	};
}

export { parseDemoRecords, toImportedReturn };
