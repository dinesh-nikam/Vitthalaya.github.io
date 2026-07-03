import Link from 'next/link';
import { canonicalMetadata } from '@/src/lib/seo';
import { Trophy, GitCompare, History, Users, ArrowRight, Star, BookOpen, CheckCircle, TrendingUp } from 'lucide-react';
import { db } from '@/src/db/client';

export const metadata = {
  title: 'समुदाय — वारकरी समुदाय | डिजिटल पंढरपूर',
  description: 'डिजिटल पंढरपूर समुदायात सहभागी व्हा — लीडरबोर्ड, सुधारणा, आणि योगदान.',
  ...canonicalMetadata({ canonical: '/community' }),
};

const COMMUNITY_FEATURES = [
  {
    href: '/leaderboard',
    icon: Trophy,
    label: 'लीडरबोर्ड',
    desc: 'सर्वात जास्त वाचणारे, योगदान देणारे वारकरी',
    color: 'text-gold bg-gold/10',
  },
  {
    href: '/corrections',
    icon: GitCompare,
    label: 'सुधारणा',
    desc: 'साहित्यातील चुका दुरुस्त करा — समुदायाच्या मदतीने',
    color: 'text-saffron bg-saffron/10',
  },
  {
    href: '/version-history',
    icon: History,
    label: 'आवृत्ती इतिहास',
    desc: 'प्रत्येक रचनेचे बदल आणि इतिहास पहा',
    color: 'text-maroon bg-maroon/10',
  },
];

export default async function CommunityPage() {
  // Fetch dynamic community stats
  const [
    totalUsers,
    totalCorrections,
    totalVersions,
    recentCorrections,
    topContributors,
  ] = await Promise.all([
    db.user.count(),
    db.correctionSuggestion.count(),
    db.compositionVersion.count(),
    // Recent corrections
    db.correctionSuggestion.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, imageUrl: true } },
        composition: { select: { titleMarathi: true, slug: true } },
      },
    }),
    // Top contributors by reputation
    db.user.findMany({
      take: 5,
      orderBy: { reputationScore: 'desc' },
      where: { reputationScore: { gt: 0 } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        reputationScore: true,
        _count: { select: { corrections: true, versions: true } },
      },
    }),
  ]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="ब्रेडक्रंब">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-saffron">मुख्यपृष्ठ</Link></li>
          <li aria-hidden="true">›</li>
          <li className="text-foreground">समुदाय</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-12 space-y-3">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-saffron" />
          <h1 className="text-3xl sm:text-4xl font-marathiHeading text-maroon dark:text-saffron font-bold">
            समुदाय
          </h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl ml-0 sm:ml-11">
          डिजिटल पंढरपूर समुदायात सहभागी व्हा. वाचा, योगदान द्या, आणि भक्ती साहित्याच्या जतनात मदत करा.
        </p>
      </header>

      {/* Community Stats */}
      <section className="mb-12" aria-labelledby="community-stats">
        <h2 id="community-stats" className="sr-only">समुदाय टक्केवारी</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-saffron/10 text-center">
            <Users className="w-6 h-6 text-saffron mx-auto mb-2" />
            <p className="text-2xl font-bold text-maroon">{totalUsers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">वापरकर्ते</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-saffron/10 text-center">
            <GitCompare className="w-6 h-6 text-saffron mx-auto mb-2" />
            <p className="text-2xl font-bold text-maroon">{totalCorrections.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">सुधारणा</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-saffron/10 text-center">
            <History className="w-6 h-6 text-saffron mx-auto mb-2" />
            <p className="text-2xl font-bold text-maroon">{totalVersions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">आवृत्त्या</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-saffron/10 text-center">
            <BookOpen className="w-6 h-6 text-saffron mx-auto mb-2" />
            <p className="text-2xl font-bold text-maroon">
              {(await db.composition.count({ where: { reviewed: true } })).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">प्रमाणित रचना</p>
          </div>
        </div>
      </section>

      {/* Community Features Grid */}
      <section className="mb-12" aria-labelledby="community-features">
        <h2 id="community-features" className="sr-only">समुदाय वैशिष्ट्ये</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {COMMUNITY_FEATURES.map(({ href, icon: Icon, label, desc, color }) => (
            <Link
              key={href}
              href={href}
              className="group bg-card rounded-2xl p-6 border border-saffron/10 hover:border-saffron/30 hover:shadow-lg transition-all text-center"
            >
              <div className={`w-14 h-14 mx-auto mb-4 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-marathiHeading font-bold text-maroon dark:text-saffron mb-2 group-hover:text-saffron transition-colors">
                {label}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {desc}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-saffron group-hover:underline">
                पहा <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Two Column Layout: Activity + Top Contributors */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <section aria-labelledby="recent-activity">
          <h2 id="recent-activity" className="font-marathiHeading text-xl text-maroon mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-saffron" />
            अलीकडील क्रियाकलाप
          </h2>
          {recentCorrections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-xl border border-saffron/10">
              अजून क्रियाकलाप नाही
            </p>
          ) : (
            <div className="space-y-3">
              {recentCorrections.map((correction) => (
                <div
                  key={correction.id}
                  className="bg-card rounded-xl p-4 border border-saffron/10 hover:border-saffron/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-saffron/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-saffron">
                        {correction.user?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium text-foreground">
                          {correction.user?.name || 'अज्ञात'}
                        </span>
                        <span className="text-muted-foreground"> ने सुधारणा केली </span>
                        {correction.composition && (
                          <Link
                            href={`/abhang/${correction.composition.slug}`}
                            className="text-saffron hover:underline"
                          >
                            {correction.composition.titleMarathi}
                          </Link>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {correction.fieldPath} — {correction.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Contributors */}
        <section aria-labelledby="top-contributors">
          <h2 id="top-contributors" className="font-marathiHeading text-xl text-maroon mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-saffron" />
            शीर्ष योगदानकर्ते
          </h2>
          {topContributors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 bg-card rounded-xl border border-saffron/10">
              अजून योगदान नाही
            </p>
          ) : (
            <div className="space-y-3">
              {topContributors.map((contributor, index) => (
                <div
                  key={contributor.id}
                  className="bg-card rounded-xl p-4 border border-saffron/10 hover:border-saffron/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-saffron/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-saffron">
                          {contributor.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{index + 1}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {contributor.name || 'अज्ञात'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contributor.reputationScore} प्रतिष्ठा • {contributor._count.corrections} सुधारणा
                      </p>
                    </div>
                    <div className="text-right">
                      <CheckCircle className="w-4 h-4 text-saffron" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Call to Action */}
      <section className="mt-12 text-center bg-card rounded-2xl p-8 border border-saffron/10">
        <h2 className="font-marathiHeading text-2xl text-maroon mb-3">
          समुदायात सहभागी व्हा
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          डिजिटल पंढरपूर समुदायाचा भाग व्हा. भक्ती साहित्याचे जतन करण्यात आणि सुधारण्यात मदत करा.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-saffron text-white rounded-lg font-medium hover:bg-saffron/90 transition-colors"
          >
            <Trophy className="w-4 h-4" />
            लीडरबोर्ड पहा
          </Link>
          <Link
            href="/corrections"
            className="inline-flex items-center gap-2 px-6 py-3 border border-saffron text-saffron rounded-lg font-medium hover:bg-saffron/5 transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            सुधारणा सुरू करा
          </Link>
        </div>
      </section>
    </div>
  );
}
