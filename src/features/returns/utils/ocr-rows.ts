import type { Rect } from '@/features/returns/model/traces.types';

const SAME_ROW_CENTER_RATIO = 0.5;
const MAX_GAP_TO_HEIGHT_RATIO = 2;

type TextBox = { text: string; bbox: Rect };

/**
 * Skleja fragmenty tekstu w wiersze: podobny środek w pionie i przerwa w poziomie mniejsza niż dwie wysokości.
 */
export function mergeIntoRows(boxes: TextBox[]): TextBox[] {
	const sortedBoxes = [...boxes].sort(
		(left, right) => left.bbox.x - right.bbox.x,
	);
	const rows: TextBox[][] = [];
	for (const box of sortedBoxes) {
		const row = rows.find((rowBoxes) =>
			continuesRow(rowBoxes[rowBoxes.length - 1].bbox, box.bbox),
		);
		if (row) {
			row.push(box);
		} else {
			rows.push([box]);
		}
	}
	return rows.map(toRowBox);
}

function continuesRow(last: Rect, next: Rect): boolean {
	const height = Math.max(last.height, next.height);
	const centerDistance = Math.abs(
		last.y + last.height / 2 - (next.y + next.height / 2),
	);
	const gap = next.x - (last.x + last.width);
	return (
		centerDistance < height * SAME_ROW_CENTER_RATIO &&
		gap < height * MAX_GAP_TO_HEIGHT_RATIO
	);
}

function toRowBox(rowBoxes: TextBox[]): TextBox {
	const left = Math.min(...rowBoxes.map((box) => box.bbox.x));
	const top = Math.min(...rowBoxes.map((box) => box.bbox.y));
	const right = Math.max(...rowBoxes.map((box) => box.bbox.x + box.bbox.width));
	const bottom = Math.max(
		...rowBoxes.map((box) => box.bbox.y + box.bbox.height),
	);
	return {
		text: rowBoxes.map((box) => box.text).join(' '),
		bbox: { x: left, y: top, width: right - left, height: bottom - top },
	};
}
