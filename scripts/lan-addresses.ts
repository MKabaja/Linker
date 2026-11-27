import { networkInterfaces } from 'node:os';

type LanAddress = { adapterName: string; address: string };

const VIRTUAL_ADAPTER_PATTERN =
	/virtual|vbox|vmware|wsl|hyper-v|vethernet|docker/i;

/**
 * Adresy IPv4 komputera w sieci lokalnej. Karty wirtualne (WSL, Docker, Hyper-V) są na końcu,
 * więc pierwszy adres to zwykle ten, pod którym telefon widzi komputer w Wi-Fi.
 */
export function listLanAddresses(): string[] {
	const lanAddresses = Object.entries(networkInterfaces()).flatMap(
		([adapterName, addresses]) =>
			(addresses ?? [])
				.filter(({ family, internal }) => family === 'IPv4' && !internal)
				.map(({ address }): LanAddress => ({ adapterName, address })),
	);
	const physical = lanAddresses.filter(
		({ adapterName }) => !isVirtual(adapterName),
	);
	const virtual = lanAddresses.filter(({ adapterName }) =>
		isVirtual(adapterName),
	);

	return [...physical, ...virtual].map(({ address }) => address);
}

function isVirtual(adapterName: string): boolean {
	return VIRTUAL_ADAPTER_PATTERN.test(adapterName);
}
