/**
 * Offline fallback page — shown when the user navigates without connectivity
 * and the page is not in the service worker cache.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ऑफलाइन — Digital Pandharpur',
  description: 'You are offline. Some content may not be available.',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Temple bell icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-saffron-50 flex items-center justify-center">
          <svg className="w-12 h-12 text-saffron" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-maroon-800 mb-2">
          ऑफलाइन
        </h1>
        <div className="w-16 h-0.5 bg-saffron mx-auto mb-4" />

        <p className="text-gray-600 mb-6 leading-relaxed">
          तुम्ही सध्या ऑफलाइन आहात. कृपया इंटरनेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          You are currently offline. Please check your internet connection and try again.
        </p>

        <div className="space-y-3">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-saffron text-white rounded-lg hover:bg-saffron-600 transition-colors font-medium"
          >
            मुख्यपृष्ठ
          </a>
          <br />
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-saffron hover:underline"
          >
            पुन्हा प्रयत्न करा
          </button>
        </div>

        {/* Cached content hint */}
        <div className="mt-10 p-4 bg-white rounded-xl shadow-sm">
          <p className="text-xs text-gray-400">
            💡 पूर्वी भेट दिलेली पृष्ठे ऑफलाइन उपलब्ध असू शकतात.
            {' '}Previously visited pages may be available offline.
          </p>
        </div>
      </div>
    </div>
  );
}
