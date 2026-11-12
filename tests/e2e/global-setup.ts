/**
 * Digital Pandharpur — E2E global setup.
 *
 * Next.js dev compiles routes lazily on first hit; on a cold CI/local machine
 * the first request to a page or API route can take tens of seconds (and
 * multiple concurrent first-hits can stall each other). The journey test
 * asserts against real rendered content with tight timeouts, so every route
 * it touches is forced to compile HERE, sequentially, before the test starts.
 *
 * Runs after Playwright's webServer is up (config `webServer.url`).
 */
import { request } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100';

/** Routes to compile before the journey starts. */
const WARM_ROUTES = [
  '/', // homepage (SSR + RSC payload)
  '/search?q=पांडुरंग', // search page SSR
  '/api/search?q=पांडुरंग', // search API (the hybrid path)
  '/api/auth/session', // next-auth session probe
  '/api/acquire/upload', // upload route (GET → 405, but forces compilation)
  '/record', // recorder page
  '/admin/moderation', // moderation panel (redirects to signin when logged out)
  '/api/acquire/moderation/list', // moderation queue API
];

async function warm(ctx: Awaited<ReturnType<typeof request.newContext>>, route: string): Promise<number> {
  const started = Date.now();
  // 405/401/307 are fine — the point is that the route compiled.
  const res = await ctx.get(route, { timeout: 240_000 }).catch((e) => {
    console.error(`[prewarm] ${route} failed to compile: ${e.message}`);
    throw e;
  });
  const ms = Date.now() - started;
  console.log(`[prewarm] ${route} → ${res.status()} (${ms}ms)`);
  return res.status();
}

export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext({ baseURL: BASE });
  try {
    for (const route of WARM_ROUTES) {
      await warm(ctx, route);
    }

    // The composition page is dynamic (/abhang/[slug]) and isn't compiled
    // until first visited. Derive a real slug from the warmed search API and
    // compile that page too, so the test's first composition visit is warm.
    const searchRes = await ctx.get('/api/search?q=पांडुरंग', { timeout: 240_000 });
    const body = (await searchRes.json().catch(() => null)) as { results?: { slug?: string }[] } | null;
    const slug = body?.results?.find((r) => r.slug)?.slug;
    if (slug) {
      await warm(ctx, `/abhang/${slug}`);
    } else {
      console.warn('[prewarm] no composition slug from search API — /abhang page will compile cold');
    }
  } finally {
    await ctx.dispose();
  }
}
