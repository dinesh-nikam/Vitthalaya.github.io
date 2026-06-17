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
  // Font optimization
  optimizeFonts: true,
};

module.exports = nextConfig;