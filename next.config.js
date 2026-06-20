/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Enable SSR for SEO
  output: 'standalone',
  webpack: (config) => {
    // Handle bun:sqlite for server-side code
    config.externals = [...(config.externals || []), 'bun:sqlite'];
    return config;
  },
};

module.exports = nextConfig;