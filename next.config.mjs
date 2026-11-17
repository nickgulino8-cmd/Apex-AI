/**
 * Static export: the whole app is plain files (HTML/JS/WASM) that run on the phone.
 * NEXT_PUBLIC_BASE_PATH is set to "/Apex-AI" when building for GitHub Pages.
 * @type {import('next').NextConfig}
 */
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const nextConfig = {
  output: "export",
  basePath: base || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: base },
  webpack(config, { isServer }) {
    if (!isServer) config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false };
    return config;
  },
};
export default nextConfig;
