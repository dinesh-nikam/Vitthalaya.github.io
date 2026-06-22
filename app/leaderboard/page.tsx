import { Suspense } from 'react';
import { Trophy, Users, GitPullRequest, BookOpen } from 'lucide-react';
import LeaderboardClient from './leaderboard-client';

export const metadata = {
  title: 'योगदानकर्ते - डिजिटल पंढरपूर',
  description: 'डिजिटल पंढरपूर मधील सर्वोच्च योगदानकर्ते — संत साहित्य जतन करण्यात मदत करणारे समर्पित वापरकर्ते',
  openGraph: {
    title: 'योगदानकर्ते लीडरबोर्ड',
    description: 'संत साहित्य जतन करण्यात मदत करणारे आमचे सर्वोच्च योगदानकर्ते',
    locale: 'mr_IN',
  },
};

export default async function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-2xl font-marathiHeading text-maroon mb-2 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-saffron" />
          योगदानकर्ते लीडरबोर्ड
        </h1>
        <p className="text-muted-foreground">
          सर्वोच्च गुण मिळवलेले योगदानकर्ते. दुरुस्त्या सुचवा, आवृत्त्या तयार करा, साहित्य जतन करा.
        </p>
      </header>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users />} label="एकूण योगदानकर्ते" value="—" />
        <StatCard icon={<GitPullRequest />} label="दुरुस्त्या" value="—" />
        <StatCard icon={<BookOpen />} label="आवृत्त्या" value="—" />
        <StatCard icon={<Trophy />} label="सर्वोच्च गुण" value="—" />
      </div>

      <Suspense fallback={<div className="text-center py-12 text-muted-foreground">लोड होत आहे...</div>}>
        <LeaderboardClient />
      </Suspense>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card rounded-lg border border-saffron/10 p-4 text-center">
      <div className="w-8 h-8 mx-auto mb-2 text-saffron">{icon}</div>
      <div className="text-2xl font-bold text-maroon">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
