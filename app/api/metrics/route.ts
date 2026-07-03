/**
 * Prometheus Metrics Endpoint
 *
 * GET /api/metrics — returns Prometheus-compatible text format metrics.
 */

import { NextResponse } from 'next/server';
import { renderMetrics } from '@/src/lib/metrics';

export async function GET(): Promise<NextResponse> {
  const body = renderMetrics();

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    },
  });
}
