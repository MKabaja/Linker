import { mkdir, writeFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

const API_URL: string = 'https://api.baselinker.com/connector.php';
const token = process.env.BASELINKER_TOKEN;

if (!token)
	throw new Error('BASELINKER_TOKEN is not defined in environment variables');

export async function GET() {
	try {
		console.log(token);
		const body = new URLSearchParams({
			method: 'getOrderStatusList',
			parameters: JSON.stringify({}),
		});
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: { 'X-BLToken': token as string },
			body,
		});

		if (!response.ok) {
			throw new Error(`BaseLinker API returned ${response.status}`);
		}
		const json = await response.json();
		console.log(json);
		if (json.status === 'ERROR') {
			throw new Error(
				`BaseLinker API returned error: ${json.error_code}, ${json.error_message}`,
			);
		}
		return NextResponse.json(json);
	} catch (error) {
		return NextResponse.json({
			status: 'ERROR',
			error: (error as Error).message,
		});
	}
}
