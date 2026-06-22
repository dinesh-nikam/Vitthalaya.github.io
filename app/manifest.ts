/**
 * PWA Web App Manifest — enables install prompt, defines app metadata.
 */
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'डिजिटल पंढरपूर — मराठी भक्ती साहित्य',
    short_name: 'डिजिटल पंढरपूर',
    description: 'लाखो अभंग, भजन, गौळणी, आरत्या, स्तोत्रे आणि संत साहित्य एका ठिकाणी',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF8EC',
    theme_color: '#FF7A1A',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['books', 'religion', 'education'],
    lang: 'mr',
    dir: 'ltr',
  };
}
