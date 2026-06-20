'use client';

import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Loader2, LogIn, AlertCircle } from 'lucide-react';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);

    if (!email || !password) {
      setLocalError('कृपया ईमेल आणि पासवर्ड दोन्ही टाका.');
      setLoading(false);
      return;
    }

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setLocalError(
          res.error === 'CredentialsSignin'
            ? 'चुकीचा ईमेल किंवा पासवर्ड टाकण्यात आला आहे. कृपया पुन्हा तपासा.'
            : res.error
        );
      } else if (res?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setLocalError('लॉगिन करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
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
            डिजिटल पंढरपूर योगदान लॉगिन
          </h1>
          <p className="text-sm text-muted-foreground">
            भक्ती साहित्याचे संरक्षण आणि संपादन करण्यासाठी योगदान द्या
          </p>
        </div>

        {/* Errors */}
        {(localError || error) && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 flex gap-2 items-start text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{localError || 'प्रमाणीकरण अयशस्वी झाले. कृपया लॉग इन क्रेडेंशियल तपासा.'}</p>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Email field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                ईमेल पत्ता (Email)
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contributor@warkari.org"
                className="w-full px-4 py-2 border border-saffron/20 focus:border-saffron focus:ring-2 focus:ring-saffron/20 bg-background rounded-lg text-sm outline-none transition-all"
              />
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                पासवर्ड (Password)
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                <span>प्रक्रिया सुरू आहे...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>प्रवेश करा (Log In)</span>
              </>
            )}
          </button>
        </form>

        {/* Developer Sandbox login assistance */}
        <div className="bg-saffron/5 border border-saffron/20 rounded-lg p-4 space-y-2">
          <p className="text-xs font-bold text-saffron font-marathiHeading uppercase tracking-wider">
            🛠️ विकासक चाचणी माहिती (Developer Login):
          </p>
          <div className="text-xs text-foreground/80 space-y-1">
            <p>
              स्थानिक चाचणीसाठी खालील डीफॉल्ट क्रेडेंशियल्स वापरा:
            </p>
            <p className="font-mono mt-1 select-all bg-background border border-saffron/10 p-1.5 rounded">
              ईमेल: <span className="font-bold text-maroon dark:text-saffron">admin@warkari.org</span><br />
              पासवर्ड: <span className="font-bold text-maroon dark:text-saffron">admin123</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center bg-cream/30 px-4 py-12 dark:bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    }>
      <SignInForm />
    </React.Suspense>
  );
}
