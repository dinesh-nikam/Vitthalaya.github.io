import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { User, MapPin, Award, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'माझे खाते - डिजिटल पंढरपूर',
  description: 'तुमचे डिजिटल पंढरपूर खाते व्यवस्थापन.',
};

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const user = session.user as any;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="ब्रेडक्रंब" className="mb-4">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-saffron">मुख्यपृष्ठ</Link></li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">माझे खाते</li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-marathiHeading font-bold text-maroon dark:text-saffron">
          माझे खाते 🚩
        </h1>
        <p className="text-muted-foreground text-sm">
          तुमच्या प्रोफाइलची माहिती, पत्ते आणि समुदाय योगदान व्यवस्थापित करा.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Summary */}
        <div className="bg-card border-2 border-saffron/20 p-6 rounded-2xl shadow-md space-y-4">
          <div className="w-20 h-20 bg-saffron/10 border border-saffron/20 rounded-full flex items-center justify-center text-4xl mx-auto">
            👤
          </div>
          <div className="text-center space-y-1">
            <h2 className="font-bold text-lg text-foreground">{user.name}</h2>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          
          <div className="border-t border-saffron/10 pt-4 flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Reputation Score:</span>
            <span className="font-bold text-saffron bg-saffron/10 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> {user.reputationScore || 0}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">भूमिका (Role):</span>
            <span className="font-bold text-maroon dark:text-saffron bg-maroon/5 dark:bg-saffron/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> {user.role}
            </span>
          </div>
        </div>

        {/* Action Options */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* View Profile */}
            <Link
              href={`/profile/${user.id}`}
              className="flex items-start gap-4 p-5 rounded-2xl border border-saffron/10 bg-card hover:border-saffron/30 hover:bg-saffron/5 transition-all shadow-sm group"
            >
              <div className="w-10 h-10 rounded-xl bg-saffron/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-saffron" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground group-hover:text-saffron transition-colors">माझी प्रोफाइल</h3>
                <p className="text-xs text-muted-foreground">तुमचे चरित्र आणि दिलेली भक्ती योगदाने पहा.</p>
              </div>
            </Link>

            {/* Address Management */}
            <Link
              href="/account/addresses"
              className="flex items-start gap-4 p-5 rounded-2xl border border-saffron/10 bg-card hover:border-saffron/30 hover:bg-saffron/5 transition-all shadow-sm group"
            >
              <div className="w-10 h-10 rounded-xl bg-saffron/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-saffron" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground group-hover:text-saffron transition-colors">पत्ता व्यवस्थापन</h3>
                <p className="text-xs text-muted-foreground">पुस्तके मागवण्यासाठी तुमचे डिलिव्हरी पत्ते जतन करा.</p>
              </div>
            </Link>
          </div>

          {/* Settings / Logs */}
          <div className="bg-card border border-saffron/10 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground border-b border-saffron/10 pb-2">प्रणाली पर्याय (System Options)</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="/reading-lists" className="px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors">
                वाचन सूची (Reading Lists)
              </Link>
              <Link href="/orders" className="px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors">
                ऑर्डर्स (Orders)
              </Link>
              <Link href="/community" className="px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors">
                समुदाय चर्चा (Community)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
