import { db } from '@/src/db/client';
import { SaintsList } from '@/components/saints-list';
import { V4PageShell } from '@/components/v4-page-shell';
import { canonicalMetadata } from '@/src/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sant Mandal - Warkari saints | Digital Pandharpur',
  description: 'Explore the lives, regions, periods, and devotional literature of Warkari saints.',
  ...canonicalMetadata({ canonical: '/sant' }),
};

export default async function SaintsIndexPage() {
  const saints = await db.saint.findMany({
    orderBy: { nameMarathi: 'asc' },
    select: {
      id: true,
      nameMarathi: true,
      nameTranslit: true,
      slug: true,
      period: true,
      biography: true,
      region: true,
      imageUrl: true,
    },
  });

  const regions = new Set(saints.map((saint) => saint.region).filter(Boolean));

  return (
    <V4PageShell
      eyebrow="Saint Gallery"
      title="The living mandal of Bhakti."
      description="Saints do not appear as profiles here. They emerge as presences: period, region, biography, abhangs, and a path into their literature."
      stats={[
        { label: 'Saints', value: saints.length },
        { label: 'Regions', value: regions.size },
        { label: 'Tradition', value: 'Wari' },
      ]}
    >
      <SaintsList initialSaints={saints} />
    </V4PageShell>
  );
}
