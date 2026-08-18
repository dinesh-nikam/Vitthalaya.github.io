'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('कृपया तुमचा ईमेल पत्ता प्रविष्ट करा.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'पासवर्ड रिसेट विनंती अयशस्वी झाली.');
      } else {
        setSuccess(data.message || 'पासवर्ड रिसेट लिंक पाठवली आहे. कृपया ईमेल तपासा.');
      }
    } catch {
      setError('पासवर्ड रिसेट विनंती करताना तांत्रिक अडचण आली. कृपया पुन्हा प्रयत्न करा.');
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
            🔑
          </div>
          <h1 className="font-marathiHeading text-2xl font-bold text-maroon dark:text-saffron">
            पासवर्ड विसरलात? (Forgot Password)
          </h1>
          <p className="text-sm text-muted-foreground">
            तुमचा नोंदणीकृत ईमेल पत्ता प्रविष्ट करा. आम्ही तुम्हाला पासवर्ड रिसेट करण्याची लिंक पाठवू.
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
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              ईमेल पत्ता (Email Address)
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-saffron hover:bg-saffron/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>प्रक्रिया सुरू आहे...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>पासवर्ड रिसेट करा (Reset Password)</span>
              </>
            )}
          </button>
        </form>

        {/* Development Helper Box */}
        <div className="bg-saffron/5 border border-saffron/20 rounded-lg p-4 space-y-2">
          <p className="text-xs font-bold text-saffron font-marathiHeading uppercase tracking-wider">
            🛠️ विकासक चाचणी माहिती (Developer Hint):
          </p>
          <p className="text-xs text-foreground/80">
            स्थानिक चाचणीसाठी, नवीन रिसेट लिंक आणि टोकन <strong>सर्व्हरच्या कन्सोल लॉगमधे</strong> (Next.js server logs) प्रिंट होतात.
          </p>
        </div>

        {/* Navigation back */}
        <div className="text-center pt-4 border-t border-saffron/10">
          <p className="text-xs text-muted-foreground">
            परत जावेसे वाटते?{' '}
            <Link href="/auth/signin" className="font-bold text-saffron hover:underline inline-flex items-center gap-0.5">
              लॉगिन करा <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
