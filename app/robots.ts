import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://digitalpandharpur.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/graph/',
          '/collections',
          '/search?', // Block arbitrary search queries; canonical search paths allowed separately
          '/*?source=*',
          '/*?sort=*',
          '/*?page=',
          '/*?page=[5-9]',
          '/*?page=[1-9][0-9]',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/', // Block AI crawlers from training on devotional content
      },
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap-index`,
  };
}
