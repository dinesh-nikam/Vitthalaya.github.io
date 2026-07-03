'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, UserPlus, AlertCircle, ArrowRight } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
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

    if (!name || !email || !password || !confirmPassword) {
      setError('कृपया सर्व रकाने भरा.');
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'नोंदणी करताना चूक झाली.');
      } else {
        setSuccess('नोंदणी यशस्वी झाली! ईमेल पडताळणी करत आहे...');
        // Forward user to verify-email page after registration
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        }, 1500);
      }
    } catch (err) {
      setError('नोंदणी करताना तांत्रिक अडचण आली. कृपया पुन्हा प्रयत्न करा.');
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
            🚩
          </div>
          <h1 className="font-marathiHeading text-2xl font-bold text-maroon dark:text-saffron">
            नवीन योगदानकर्ता नोंदणी
          </h1>
          <p className="text-sm text-muted-foreground">
            भक्ती साहित्याचे जतन करण्यासाठी डिजिटल पंढरपुरात सामील व्हा
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

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* Name */}
            <div className="space-y-1">
              <label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                पूर्ण नाव (Full Name)
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="उदा. ज्ञानेश्वर पाटील"
                className="w-full px-4 py-2 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all"
              />
            </div>

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                पासवर्ड (Password)
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
                <span>नोंदणी सुरू आहे...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>नोंदणी करा (Sign Up)</span>
              </>
            )}
          </button>
        </form>

        {/* Navigation back */}
        <div className="text-center pt-4 border-t border-saffron/10">
          <p className="text-xs text-muted-foreground">
            आधीच नोंदणी केली आहे?{' '}
            <Link href="/auth/signin" className="font-bold text-saffron hover:underline inline-flex items-center gap-0.5">
              लॉगिन करा <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
