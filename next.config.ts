import type { NextConfig } from 'next';
import { listLanAddresses } from './scripts/lan-addresses';

const nextConfig: NextConfig = {
	reactCompiler: true,
	typedRoutes: true,
	allowedDevOrigins: [...listLanAddresses(), '*.trycloudflare.com'],
};

export default nextConfig;
