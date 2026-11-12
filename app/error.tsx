'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Observability: Log structured error
    console.error('App Router Uncaught Error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main
      id="main-content"
      role="alert"
      aria-live="assertive"
      className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-gradient-to-b from-background via-cream to-background"
    >
      <div className="max-w-lg w-full text-center p-8 sm:p-10 rounded-3xl bg-card border border-maroon/20 shadow-xl backdrop-blur-sm">
        {/* Warning Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 mb-6">
          <AlertCircle className="w-8 h-8" aria-hidden="true" />
        </div>

        <p className="text-sm uppercase tracking-wider font-semibold text-red-600 dark:text-red-400 font-marathi mb-2">
          अनपेक्षित तांत्रिक अडचण
        </p>

        <h1 className="text-2xl sm:text-3xl font-marathiHeading font-bold text-foreground mb-4">
          माहिती लोड करताना अडचण आली
        </h1>

        <p className="text-base font-marathi text-foreground/75 mb-6 leading-relaxed">
          कृपया काही क्षणांनंतर पुन्हा प्रयत्न करा. अडचण कायम राहिल्यास मुख्य पृष्ठावर जा.
        </p>

        {error.digest && (
          <p className="text-xs font-mono text-foreground/40 mb-6 select-all">
            संदर्भ कोड: {error.digest}
          </p>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-saffron hover:bg-saffron-600 text-white font-marathi font-medium shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-saffron focus:ring-offset-2"
          >
            <RefreshCw className="w-5 h-5" aria-hidden="true" />
            <span>पुन्हा प्रयत्न करा</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-marathi font-medium border border-border transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-saffron focus:ring-offset-2"
          >
            <Home className="w-5 h-5 text-saffron" aria-hidden="true" />
            <span>मुख्य पृष्ठावर जा</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
