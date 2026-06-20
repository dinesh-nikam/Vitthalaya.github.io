/**
 * Digital Pandharpur — Website Pages Verification Script
 * Sends HTTP requests to all key pages on localhost:3000 to verify status.
 * Usage:
 *   bun run scripts/verify-pages.ts
 */

import { db } from '../src/db/client';

const TARGET_HOST = 'http://localhost:3000';

interface PageTestResult {
  url: string;
  name: string;
  status: number;
  error?: string;
  isCustomPage: boolean;
}

async function verifyPages() {
  console.log('🔍 Starting comprehensive website pages verification...\n');

  // Fetch some dynamic entities from DB to verify dynamic routes
  const saint = await db.saint.findFirst({ select: { slug: true, nameMarathi: true } });
  const category = await db.category.findFirst({ select: { slug: true, nameMarathi: true } });
  const festival = await db.festival.findFirst({ select: { nameTranslit: true, nameMarathi: true } });
  const composition = await db.composition.findFirst({ select: { slug: true, titleMarathi: true } });

  const pagesToTest = [
    { name: 'Home Page', path: '/' },
    { name: 'Saints List', path: '/sant' },
    { name: 'Categories List', path: '/category' },
    { name: 'Festivals List', path: '/festival' },
    { name: 'Search Interface', path: '/search' },
    { name: 'Admin Moderation Dashboard', path: '/admin/moderation' },
  ];

  if (saint) {
    pagesToTest.push({ name: `Saint Detail (${saint.nameMarathi})`, path: `/sant/${saint.slug}` });
  } else {
    pagesToTest.push({ name: 'Saint Detail (Tukaram Maharaj)', path: '/sant/tukaram-maharaj' });
  }

  if (category) {
    pagesToTest.push({ name: `Category Detail (${category.nameMarathi})`, path: `/category/${category.slug}` });
  } else {
    pagesToTest.push({ name: 'Category Detail (Vitthal)', path: '/category/vitthal' });
  }

  if (festival) {
    // Slugs for festivals are transliterations slugified
    const festSlug = festival.nameTranslit.toLowerCase().replace(/\s+/g, '-');
    pagesToTest.push({ name: `Festival Detail (${festival.nameMarathi})`, path: `/festival/${festSlug}` });
  } else {
    pagesToTest.push({ name: 'Festival Detail (Ashadhi Ekadashi)', path: '/festival/ashadhi-ekadashi' });
  }

  if (composition) {
    pagesToTest.push({ name: `Composition View (${composition.titleMarathi})`, path: `/abhang/${composition.slug}` });
  } else {
    pagesToTest.push({ name: 'Composition View (Sample)', path: '/abhang/sample-composition-slug' });
  }

  const results: PageTestResult[] = [];

  for (const page of pagesToTest) {
    const url = `${TARGET_HOST}${page.path}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
      });
      
      let errorDetail = '';
      if (response.status === 500) {
        const bodyText = await response.text();
        const errorMatch = bodyText.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || 
                            bodyText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) ||
                            bodyText.match(/<div class="[^"]*error[^"]*">([\s\S]*?)<\/div>/i);
        if (errorMatch) {
          errorDetail = errorMatch[1].trim().replace(/<[^>]*>/g, '').substring(0, 200);
        } else {
          // Remove HTML tags to extract readable text
          const plainText = bodyText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          errorDetail = plainText.substring(0, 200);
        }
      }
      
      results.push({
        url,
        name: page.name,
        status: response.status,
        error: errorDetail || undefined,
        isCustomPage: true,
      });
    } catch (err: any) {
      results.push({
        url,
        name: page.name,
        status: 0,
        error: err.message || String(err),
        isCustomPage: true,
      });
    }
  }

  console.log('📊 Verification Results:\n');
  let allWorking = true;
  for (const res of results) {
    const statusText = res.status === 0 
      ? `CRASHED (${res.error})` 
      : `${res.status}${res.error ? ` (${res.error})` : ''}`;
    const working = res.status === 200;
    if (!working) allWorking = false;
    console.log(`- ${res.name} (${res.url}): ${working ? '✅ 200 OK' : `❌ ${statusText}`}`);
  }

  if (allWorking) {
    console.log('\n🎉 All core pages returned 200 OK!');
  } else {
    console.log('\n⚠️ Some pages are missing or returned errors. Please inspect the logs.');
  }
}

verifyPages().catch(err => {
  console.error('Fatal execution error:', err);
});
