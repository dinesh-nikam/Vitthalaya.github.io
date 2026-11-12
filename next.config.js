/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  // Pin the tracing root to this project so stray lockfiles outside it
  // (e.g. a bun.lock in the user's home directory) never get picked up.
  outputFileTracingRoot: __dirname,
  experimental: {
    reactCompiler: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Enable SSR for SEO
  output: process.env.NEXT_STANDALONE === 'true' ? 'standalone' : undefined,
  webpack: (config, { dev }) => {
    // Handle bun:sqlite for server-side code
    config.externals = [...(config.externals || []), 'bun:sqlite'];
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
