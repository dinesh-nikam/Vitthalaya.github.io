/**
 * Health Check Endpoint
 * Used by load balancers and monitoring systems to verify service health
 *
 * GET /api/health
 * Returns: 200 if healthy, 503 if any critical service is down
 */

import { NextResponse } from 'next/server';
import { db } from '@/src/db/client';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error' | 'not_configured';
    meilisearch: 'ok' | 'error' | 'not_configured';
    opensearch: 'ok' | 'error' | 'not_configured';
    memory: {
      usedMB: number;
      totalMB: number;
    };
  };
  version: string;
}

export async function GET(): Promise<NextResponse<HealthCheckResult>> {
  const checks = {
    database: 'ok' as 'ok' | 'error',
    redis: 'not_configured' as 'ok' | 'error' | 'not_configured',
    meilisearch: 'not_configured' as 'ok' | 'error' | 'not_configured',
    opensearch: 'not_configured' as 'ok' | 'error' | 'not_configured',
    memory: {
      usedMB: 0,
      totalMB: 0,
    },
  };

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check database connectivity
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (err: any) {
    checks.database = 'error';
    status = 'unhealthy';
    console.error('[Health] Database check failed:', err);
  }

  // Check Redis if configured
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  if (redisUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${redisUrl}/ping`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      checks.redis = response.ok ? 'ok' : 'error';
    } catch {
      checks.redis = 'error';
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
  }

  // Check Meilisearch if configured
  const meiliHost = process.env.MEILI_HOST;
  if (meiliHost) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${meiliHost}/health`, {
        method: 'GET',
        headers: process.env.MEILI_MASTER_KEY ? { Authorization: `Bearer ${process.env.MEILI_MASTER_KEY}` } : {},
        signal: controller.signal,
      });

      clearTimeout(timeout);
      checks.meilisearch = response.ok ? 'ok' : 'error';
    } catch {
      checks.meilisearch = 'error';
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
  }

  // Check OpenSearch if configured
  const osUrl = process.env.OPENSEARCH_URL;
  if (osUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${osUrl}/_cluster/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json();
      checks.opensearch = data.status === 'green' || data.status === 'yellow' ? 'ok' : 'error';
    } catch {
      checks.opensearch = 'error';
      status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  checks.memory = {
    usedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    totalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
  };

  const result: HealthCheckResult = {
    status,
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.npm_package_version || '0.1.0',
  };

  const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

  return NextResponse.json(result, { status: httpStatus });
}