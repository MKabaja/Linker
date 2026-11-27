import type { NextConfig } from 'next';
import { listLanAddresses } from './scripts/lan-addresses';

const nextConfig: NextConfig = {
	reactCompiler: true,
	typedRoutes: true,
	allowedDevOrigins: [...listLanAddresses(), '*.trycloudflare.com'],
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'kozackadrogeria.pl',
				pathname: '/img/p/**',
			},
		],
	},
};

export default nextConfig;
