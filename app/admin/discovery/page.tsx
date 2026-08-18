import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/src/db/client';
import { SourceRegistry } from '@/src/discovery/source-registry';
import { ScraperMonitor } from '@/src/discovery/scraper-monitor';
import DiscoveryDashboardClient from './DiscoveryDashboardClient.tsx';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

interface DocNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DocNode[];
  fileType?: string;
}

export default async function AdminDiscoveryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/');
  }

  // Fetch aggregate stats and status counts
  const stats = await SourceRegistry.getAggregateStats();
  const counts = await SourceRegistry.getCounts();
  const sources = await SourceRegistry.getAll({ limit: 100 });
  const recentJobs = await db.discoveryJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      source: {
        select: {
          name: true,
          type: true,
        },
      },
    },
  });

  // Calculate compositions discovered today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayNewItems = await db.discoveryJob.aggregate({
    _sum: {
      itemsNew: true,
    },
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  const compositionsToday = todayNewItems._sum.itemsNew ?? 0;

  // Fetch active alerts
  const alerts = await ScraperMonitor.getActiveAlerts();

  // Combine counts and stats
  const dashboardStats = {
    ...stats,
    statusCounts: counts,
    activeSources: sources.filter((s) => s.status === 'ACTIVE').length,
    compositionsToday,
  };

  // Convert dates and other complex objects to plain strings/numbers for Client Component serialization
  const serializedSources = sources.map((s) => ({
    ...s,
    trustScore: Number(s.trustScore),
    errorRate: Number(s.errorRate),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    lastFetchAt: s.lastFetchAt?.toISOString() ?? null,
    lastErrorAt: s.lastErrorAt?.toISOString() ?? null,
  }));

  const serializedRecentJobs = recentJobs.map((j) => ({
    ...j,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
    startedAt: j.startedAt?.toISOString() ?? null,
    completedAt: j.completedAt?.toISOString() ?? null,
  }));

  const serializedAlerts = alerts.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  // Fetch system documentation files from /docs directly on the server side
  let docTree: DocNode[] = [];
  const docFiles: Record<string, { content: string; fileType: string }> = {};

  try {
    const docsDir = path.join(process.cwd(), 'docs');
    if (fs.existsSync(docsDir)) {
      const buildTree = (currentPath: string, relativePath = ''): DocNode[] => {
        const items = fs.readdirSync(currentPath);
        const nodes: DocNode[] = [];

        for (const item of items) {
          if (item.startsWith('.')) continue;

          const fullPath = path.join(currentPath, item);
          const relPath = relativePath ? `${relativePath}/${item}` : item;
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            nodes.push({
              name: item,
              path: relPath,
              type: 'directory',
              children: buildTree(fullPath, relPath),
            });
          } else {
            const fileType = path.extname(item).substring(1).toLowerCase();
            const content = fs.readFileSync(fullPath, 'utf8');

            docFiles[relPath] = { content, fileType };

            nodes.push({
              name: item,
              path: relPath,
              type: 'file',
              fileType,
            });
          }
        }

        return nodes.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      };

      docTree = buildTree(docsDir);
    }
  } catch (err) {
    console.error('Error loading docs on server:', err);
  }

  return (
    <DiscoveryDashboardClient
      initialStats={dashboardStats}
      initialSources={serializedSources as any}
      initialJobs={serializedRecentJobs}
      initialAlerts={serializedAlerts}
      initialDocTree={docTree}
      initialDocFiles={docFiles}
    />
  );
}
