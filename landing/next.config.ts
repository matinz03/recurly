import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// This project sits inside the Expo repo, which has its own lockfile at the
// root. Left to infer, Turbopack picks that root and starts tracing the whole
// React Native app; pinning it here keeps the landing page's module graph to
// this folder.
const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
    reactStrictMode: true,
    turbopack: { root: here },
};

export default nextConfig;
