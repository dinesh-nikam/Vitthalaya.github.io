'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = React.useState(emailParam);
  const [token, setToken] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!email || !token) {
      setError('कृपया ईमेल आणि पडताळणी कोड (OTP) दोन्ही टाका.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'कोड पडताळणी अयशस्वी झाली.');
      } else {
        setSuccess('ईमेल पडताळणी यशस्वी झाली! लॉगिन करत आहे...');
        setTimeout(() => {
          router.push('/auth/signin');
        }, 1500);
      }
    } catch (err) {
      setError('पडताळणी करताना तांत्रिक अडचण आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-cream/30 px-4 py-12 dark:bg-background">
      <div className="max-w-md w-full space-y-8 bg-card border-2 border-saffron/20 p-8 rounded-2xl shadow-xl">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-saffron/10 border border-saffron/20 rounded-full flex items-center justify-center mx-auto text-3xl">
            ✉️
          </div>
          <h1 className="font-marathiHeading text-2xl font-bold text-maroon dark:text-saffron">
            ईमेल पडताळणी (Verify Email)
          </h1>
          <p className="text-sm text-muted-foreground">
            आम्ही तुमच्या नोंदणीकृत ईमेलवर पाठवलेला ६-अंकी कोड (OTP) प्रविष्ट करा
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 flex gap-2 items-start text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3 text-sm text-green-600 dark:text-green-400">
            <p>{success}</p>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                ईमेल पत्ता (Email)
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@warkari.org"
                className="w-full px-4 py-2 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all"
              />
            </div>

            {/* Token/OTP Field */}
            <div className="space-y-1">
              <label htmlFor="token" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                पडताळणी कोड / ओटीपी (Verification Code / OTP)
              </label>
              <input
                id="token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="६-अंकी कोड प्रविष्ट करा"
                maxLength={6}
                className="w-full px-4 py-2 text-center text-lg tracking-widest font-mono border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-saffron hover:bg-saffron/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>पडताळणी सुरू आहे...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>कोड पडताळणी करा</span>
              </>
            )}
          </button>
        </form>

        {/* Development Helper Box */}
        <div className="bg-saffron/5 border border-saffron/20 rounded-lg p-4 space-y-2">
          <p className="text-xs font-bold text-saffron font-marathiHeading uppercase tracking-wider">
            💡 विकासक सूचना (Dev Hint):
          </p>
          <p className="text-xs text-foreground/80">
            स्थानिक चाचणी दरम्यान, ओटीपी कोड <strong>सर्व्हरच्या कन्सोल लॉगमधे</strong> (Next.js server logs) प्रिंट होतो. कृपया तेथून तो कोड कॉपी करून येथे प्रविष्ट करा.
          </p>
        </div>

        {/* Navigation back */}
        <div className="text-center pt-4 border-t border-saffron/10">
          <p className="text-xs text-muted-foreground">
            परत जायचे आहे?{' '}
            <Link href="/auth/signin" className="font-bold text-saffron hover:underline inline-flex items-center gap-0.5">
              लॉगिन पानावर जा <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center bg-cream/30 px-4 py-12 dark:bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    }>
      <VerifyEmailForm />
    </React.Suspense>
  );
}
