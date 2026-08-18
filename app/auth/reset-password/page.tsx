'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, KeySquare, AlertCircle, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!token || !email) {
      setError('पासवर्ड रिसेट टोकन किंवा ईमेल गहाळ आहे. कृपया पासवर्ड रिसेट करण्यासाठी पुन्हा लिंक मागवा.');
      setLoading(false);
      return;
    }

    if (!password || !confirmPassword) {
      setError('कृपया दोन्ही पासवर्ड फील्ड भरा.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('पासवर्ड जुळत नाहीत. कृपया पुन्हा तपासा.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('पासवर्ड किमान ६ अक्षरांचा असावा.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'पासवर्ड रिसेट करण्यास अडचण आली.');
      } else {
        setSuccess('पासवर्ड यशस्वीरित्या बदलला गेला! लॉगिन पानावर पाठवत आहे...');
        setTimeout(() => {
          router.push('/auth/signin');
        }, 1500);
      }
    } catch {
      setError('पासवर्ड रिसेट करताना तांत्रिक अडचण आली. कृपया पुन्हा प्रयत्न करा.');
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
            🔒
          </div>
          <h1 className="font-marathiHeading text-2xl font-bold text-maroon dark:text-saffron">
            नवीन पासवर्ड सेट करा (Reset Password)
          </h1>
          <p className="text-sm text-muted-foreground">
            खाली तुमचा नवीन सुरक्षित पासवर्ड प्रविष्ट करा
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* New Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                नवीन पासवर्ड (New Password)
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                पासवर्डची खात्री करा (Confirm Password)
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all"
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
                <span>पासवर्ड अपडेट होत आहे...</span>
              </>
            ) : (
              <>
                <KeySquare className="w-4 h-4" />
                <span>पासवर्ड अपडेट करा (Update Password)</span>
              </>
            )}
          </button>
        </form>

        {/* Navigation back */}
        <div className="text-center pt-4 border-t border-saffron/10">
          <p className="text-xs text-muted-foreground">
            रद्द करायचे आहे?{' '}
            <Link href="/auth/signin" className="font-bold text-saffron hover:underline inline-flex items-center gap-0.5">
              लॉगिन करा <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center bg-cream/30 px-4 py-12 dark:bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    }>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
