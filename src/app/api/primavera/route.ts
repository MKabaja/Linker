import { mkdir, writeFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

export async function GET() {
	const url = `https://orders.pvex.pl/pricelist.php?wh=all&token=${process.env.PVEX_TOKEN}&format=csv`;

	const res = await fetch(url, { cache: 'no-store' });
	if (!res.ok) {
		return NextResponse.json(
			{ error: `PVEX zwrócił ${res.status}` },
			{ status: 502 },
		);
	}

	const buffer = await res.arrayBuffer();
	const text = new TextDecoder('utf-8').decode(buffer); // patrz uwaga o kodowaniu niżej

	// zapis surowego pliku do wglądu
	await mkdir('data', { recursive: true });
	await writeFile('data/pvex.csv', Buffer.from(buffer));

	const lines = text.split(/\r?\n/).filter(Boolean);
	console.log('Liczba linii:', lines.length);
	console.log(lines.slice(0, 5).join('\n'));

	return NextResponse.json({
		total: lines.length,
		header: lines[0],
		preview: lines.slice(1, 6),
	});
}
