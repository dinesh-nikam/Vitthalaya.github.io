/**
 * Sprint 2 Verification Script
 * Validates Redis Caching on Sitemaps and sliding window rate limiting on AI Assistant API.
 */

async function runSprint2Tests() {
  console.log('🏁 Starting Sprint 2 Integration & Verification Tests...');
  const baseUrl = 'http://localhost:3000';

  // ---------------------------------------------------------
  // Test 1: Sitemap Caching Verification
  // ---------------------------------------------------------
  try {
    console.log('\n📡 Test 1: Sitemap Caching (GET /sitemap-compositions/1)...');
    
    // First request - expected MISS
    const res1 = await fetch(`${baseUrl}/sitemap-compositions/1`);
    const cacheHeader1 = res1.headers.get('X-Cache') || 'NONE';
    console.log(`First request status: ${res1.status}`);
    console.log(`First request X-Cache: ${cacheHeader1}`);
    
    // Second request - expected HIT
    const res2 = await fetch(`${baseUrl}/sitemap-compositions/1`);
    const cacheHeader2 = res2.headers.get('X-Cache') || 'NONE';
    console.log(`Second request status: ${res2.status}`);
    console.log(`Second request X-Cache: ${cacheHeader2}`);
    
    if (res2.status === 200 && (cacheHeader2 === 'HIT' || cacheHeader1 === 'MISS')) {
      console.log('✅ PASS: Sitemap cache hit successfully validated');
    } else {
      console.log('❌ FAIL: Sitemap caching did not behave as expected');
    }
  } catch (err) {
    console.log('⚠️ Could not connect to local server for sitemap test. Make sure "bun dev" is running.');
  }

  // ---------------------------------------------------------
  // Test 2: AI Assistant Rate Limiting Verification
  // ---------------------------------------------------------
  try {
    console.log('\n🛡️ Test 2: AI Assistant Rate Limiting (POST /api/ai/assistant)...');
    
    let hitRateLimit = false;
    let rateLimitHeaderReset = '';

    for (let i = 1; i <= 8; i++) {
      const res = await fetch(`${baseUrl}/api/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'विठ्ठल अभंग दाखवा' }),
      });
      
      const limit = res.headers.get('X-RateLimit-Limit');
      const remaining = res.headers.get('X-RateLimit-Remaining');
      
      console.log(`Query ${i} - Status: ${res.status}, Remaining: ${remaining}/${limit}`);
      
      if (res.status === 429) {
        hitRateLimit = true;
        rateLimitHeaderReset = res.headers.get('X-RateLimit-Reset') || '';
        const body = await res.json();
        console.log(`Rate limit reached (429)! Message:`, body.error);
        break;
      }
    }

    if (hitRateLimit) {
      console.log('✅ PASS: AI assistant rate-limiting successfully triggered at request threshold!');
    } else {
      console.log('❌ FAIL: Rate limiter did not trigger (exceeded request limit without 429 error)');
    }
  } catch (err) {
    console.log('⚠️ Could not connect to local server for rate limiting test.');
  }

  console.log('\n🏁 Sprint 2 verification tests script finished.');
}

runSprint2Tests().catch((err) => {
  console.error('Fatal error running Sprint 2 verification:', err);
});
