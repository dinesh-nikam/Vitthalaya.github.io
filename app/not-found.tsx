import Link from 'next/link';
import { Home, Search, BookOpen, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main
      id="main-content"
      role="main"
      className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-gradient-to-b from-background via-cream to-background"
    >
      <div className="max-w-xl w-full text-center p-8 sm:p-12 rounded-3xl bg-card border border-border/80 shadow-xl backdrop-blur-sm">
        {/* Devotional icon badge */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-saffron-100 text-saffron mb-6 shadow-inner">
          <span className="text-4xl" aria-hidden="true">🚩</span>
        </div>

        {/* Status & Title */}
        <p className="text-sm uppercase tracking-wider font-semibold text-saffron font-marathi mb-2">
          त्रुटी ४०४ • पृष्ठ सापडले नाही
        </p>
        <h1 className="text-3xl sm:text-4xl font-marathiHeading font-bold text-foreground mb-4">
          हे पान उपलब्ध नाही
        </h1>

        <p className="text-base font-marathi text-foreground/70 mb-8 max-w-md mx-auto leading-relaxed">
          आपण शोधत असलेला अभंग, संत किंवा पृष्ठ अस्तित्वात नाही किंवा त्याचा पत्ता बदलला असावा.
          कृपया खालील पर्यायांमधून शोधा किंवा मुख्य पृष्ठावर जा.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-saffron hover:bg-saffron-600 text-white font-marathi font-medium shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-saffron focus:ring-offset-2"
          >
            <Home className="w-5 h-5" aria-hidden="true" />
            <span>मुख्य पृष्ठावर जा</span>
          </Link>

          <Link
            href="/search"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-marathi font-medium border border-border transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-saffron focus:ring-offset-2"
          >
            <Search className="w-5 h-5 text-saffron" aria-hidden="true" />
            <span>अभंग शोधा</span>
          </Link>
        </div>

        {/* Secondary Quick Links */}
        <div className="mt-10 pt-8 border-t border-border/60">
          <p className="text-xs uppercase tracking-wider font-semibold text-foreground/50 font-marathi mb-4">
            इतर महत्त्वाचे विभाग
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm font-marathi">
            <Link
              href="/saints"
              className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-saffron transition-colors"
            >
              <Compass className="w-4 h-4 text-saffron" aria-hidden="true" />
              <span>संत परंपरा</span>
            </Link>
            <span className="text-border">•</span>
            <Link
              href="/wari"
              className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-saffron transition-colors"
            >
              <span aria-hidden="true">🚩</span>
              <span>वारी दर्शन</span>
            </Link>
            <span className="text-border">•</span>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-saffron transition-colors"
            >
              <BookOpen className="w-4 h-4 text-saffron" aria-hidden="true" />
              <span>संत वाङ्मय</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
