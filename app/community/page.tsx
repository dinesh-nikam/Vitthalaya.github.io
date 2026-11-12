import Link from 'next/link';
import { canonicalMetadata } from '@/src/lib/seo';
import { Trophy, GitCompare, History, Users, ArrowRight, ChevronRight, BookOpen, TrendingUp } from 'lucide-react';
import { db } from '@/src/db/client';
import '@/app/homepage.css';

export const metadata = {
  title: 'वारकरी समुदाय : डिजिटल पंढरपूर',
  description: 'डिजिटल पंढरपूर समुदायात सहभागी व्हा : लीडरबोर्ड, सुधारणा, आणि सामूहिक भक्ती योगदान.',
  ...canonicalMetadata({ canonical: '/community' }),
};

const COMMUNITY_FEATURES = [
  {
    href: '/leaderboard',
    icon: Trophy,
    label: 'लीडरबोर्ड',
    desc: 'सर्वात जास्त वाचन व अभ्यास करणारे सक्रिय वारकरी भक्त',
  },
  {
    href: '/corrections',
    icon: GitCompare,
    label: 'पाठभेद सुधारणा',
    desc: 'साहित्यातील अशुद्ध शब्द दुरुस्त करा : समुदायाच्या सहकार्याने',
  },
  {
    href: '/version-history',
    icon: History,
    label: 'आवृत्ती इतिहास',
    desc: 'प्रत्येक रचनेचे संपादन बदल व अधिकृत इतिहास तपासा',
  },
];

export default async function CommunityPage() {
  const [
    totalUsers,
    totalCorrections,
    totalVersions,
    reviewedCompositions,
    recentCorrections,
    topContributors,
  ] = await Promise.all([
    db.user.count(),
    db.correctionSuggestion.count(),
    db.compositionVersion.count(),
    db.composition.count({ where: { reviewed: true } }),
    db.correctionSuggestion.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, imageUrl: true } },
        composition: { select: { titleMarathi: true, slug: true } },
      },
    }),
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
    <div className="vitthalaya-shell min-h-screen py-10">
      <div className="vitthalaya-container max-w-5xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="ब्रेडक्रंब">
          <ol className="flex items-center gap-2 text-xs font-marathi text-[var(--dp-muted)]">
            <li>
              <Link href="/" className="hover:text-[var(--dp-gold)] transition-colors">
                मुख्यपृष्ठ
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li className="text-[var(--dp-ink)]">समुदाय</li>
          </ol>
        </nav>

        {/* Page Header */}
        <header className="mb-12 text-center max-w-3xl mx-auto">
          <p className="text-xs text-[var(--dp-gold)] font-marathi mb-2">
            वारकरी अभ्यासक मंडळ
          </p>
          <h1 className="vitthalaya-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            वारकरी भक्ती समुदाय
          </h1>
          <p className="vitthalaya-prose text-sm sm:text-base text-[var(--dp-ink-dim)] leading-relaxed mb-6">
            डिजिटल पंढरपूर समुदायात सहभागी व्हा. वाचा, योगदान द्या, आणि भक्ती साहित्याच्या जतनात मदत करा.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-center">
            <div className="vitthalaya-card rounded p-3 border border-[var(--dp-rule)]">
              <Users size={16} className="text-[var(--dp-gold)] mx-auto mb-1" aria-hidden="true" />
              <p className="vitthalaya-display text-lg font-bold">{totalUsers.toLocaleString('mr-IN')}</p>
              <p className="text-[11px] text-[var(--dp-muted)] font-marathi">वापरकर्ते</p>
            </div>
            <div className="vitthalaya-card rounded p-3 border border-[var(--dp-rule)]">
              <GitCompare size={16} className="text-[var(--dp-gold)] mx-auto mb-1" aria-hidden="true" />
              <p className="vitthalaya-display text-lg font-bold">{totalCorrections.toLocaleString('mr-IN')}</p>
              <p className="text-[11px] text-[var(--dp-muted)] font-marathi">सुधारणा</p>
            </div>
            <div className="vitthalaya-card rounded p-3 border border-[var(--dp-rule)]">
              <History size={16} className="text-[var(--dp-gold)] mx-auto mb-1" aria-hidden="true" />
              <p className="vitthalaya-display text-lg font-bold">{totalVersions.toLocaleString('mr-IN')}</p>
              <p className="text-[11px] text-[var(--dp-muted)] font-marathi">आवृत्त्या</p>
            </div>
            <div className="vitthalaya-card rounded p-3 border border-[var(--dp-rule)]">
              <BookOpen size={16} className="text-[var(--dp-gold)] mx-auto mb-1" aria-hidden="true" />
              <p className="vitthalaya-display text-lg font-bold">{reviewedCompositions.toLocaleString('mr-IN')}</p>
              <p className="text-[11px] text-[var(--dp-muted)] font-marathi">प्रमाणित रचना</p>
            </div>
          </div>
        </header>

        {/* Feature Cards */}
        <section className="mb-14" aria-labelledby="community-features">
          <h2 id="community-features" className="sr-only">समुदाय वैशिष्ट्ये</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {COMMUNITY_FEATURES.map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="group vitthalaya-card rounded p-6 border border-[var(--dp-rule)] hover:border-[var(--dp-gold)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dp-focus)] active:translate-y-px text-center flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 mx-auto mb-4 rounded bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex items-center justify-center text-[var(--dp-gold)]">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <h3 className="vitthalaya-display text-lg font-bold text-[var(--dp-ink)] group-hover:text-[var(--dp-gold)] transition-colors mb-2">
                    {label}
                  </h3>
                  <p className="text-xs text-[var(--dp-ink-dim)] font-marathi leading-relaxed mb-4">
                    {desc}
                  </p>
                </div>
                <div className="inline-flex items-center justify-center gap-1 text-xs font-semibold font-marathi text-[var(--dp-gold)] group-hover:underline">
                  <span>पहा</span>
                  <ArrowRight size={13} aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Two Column Layout: Activity + Top Contributors */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <section aria-labelledby="recent-activity" className="space-y-4">
            <h2 id="recent-activity" className="vitthalaya-display text-lg font-bold flex items-center gap-2 pb-2 border-b border-[var(--dp-rule)]">
              <TrendingUp size={16} className="text-[var(--dp-gold)]" aria-hidden="true" />
              अलीकडील सुधारणा व क्रियाकलाप
            </h2>

            {recentCorrections.length === 0 ? (
              <div className="vitthalaya-card rounded p-6 border border-[var(--dp-rule)] text-center text-xs font-marathi text-[var(--dp-muted)]">
                सध्या कोणतीही नवीन सुधारणा नोंदवलेली नाही.
              </div>
            ) : (
              <div className="space-y-3">
                {recentCorrections.map((correction) => (
                  <div
                    key={correction.id}
                    className="vitthalaya-card rounded p-3.5 border border-[var(--dp-rule)] text-xs font-marathi"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex items-center justify-center text-[var(--dp-gold)] font-bold text-[11px] shrink-0">
                        {correction.user?.name?.charAt(0) || 'वा'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--dp-ink)] leading-relaxed">
                          <span className="font-semibold">{correction.user?.name || 'वारकरी अभ्यासक'}</span>
                          <span className="text-[var(--dp-muted)]"> यांनी सुधारणा केली : </span>
                          {correction.composition && (
                            <Link
                              href={`/abhang/${correction.composition.slug}`}
                              className="text-[var(--dp-gold)] hover:underline font-semibold"
                            >
                              {correction.composition.titleMarathi}
                            </Link>
                          )}
                        </p>
                        <p className="text-[10px] text-[var(--dp-muted)] mt-1">
                          स्थिती : {correction.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Top Contributors */}
          <section aria-labelledby="top-contributors" className="space-y-4">
            <h2 id="top-contributors" className="vitthalaya-display text-lg font-bold flex items-center gap-2 pb-2 border-b border-[var(--dp-rule)]">
              <Trophy size={16} className="text-[var(--dp-gold)]" aria-hidden="true" />
              प्रमुख योगदानकर्ते
            </h2>

            {topContributors.length === 0 ? (
              <div className="vitthalaya-card rounded p-6 border border-[var(--dp-rule)] text-center text-xs font-marathi text-[var(--dp-muted)]">
                अजून योगदानकर्त्यांची नोंद सुरू आहे.
              </div>
            ) : (
              <div className="space-y-3">
                {topContributors.map((user, idx) => (
                  <div
                    key={user.id}
                    className="vitthalaya-card rounded p-3.5 border border-[var(--dp-rule)] flex items-center justify-between text-xs font-marathi"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[var(--dp-gold)] w-4 text-center">
                        {idx + 1}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-[var(--dp-ground-well)] border border-[var(--dp-rule)] flex items-center justify-center text-[var(--dp-gold)] font-bold text-[11px] shrink-0">
                        {user.name?.charAt(0) || 'वा'}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--dp-ink)]">{user.name || 'वारकरी अभ्यासक'}</p>
                        <p className="text-[10px] text-[var(--dp-muted)]">
                          {user._count.corrections} सुधारणा • {user._count.versions} आवृत्त्या
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[var(--dp-ground-well)] text-[var(--dp-gold)] border border-[var(--dp-rule)] text-[10px] font-bold">
                      {user.reputationScore} गुण
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
