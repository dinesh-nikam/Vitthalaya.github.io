/**
 * API Security Verification Script
 * Validates that secured API endpoints return proper 401 Unauthorized responses
 * when invoked without authentication cookies.
 */

async function runSecurityTests() {
  console.log('🔒 Starting API Security Integration Tests...');
  const baseUrl = 'http://localhost:3000';

  // Test Endpoint 1: GET /api/community/corrections (Unauthenticated)
  try {
    const res = await fetch(`${baseUrl}/api/community/corrections`);
    console.log(`\nTest 1: GET /api/community/corrections`);
    console.log(`Status: ${res.status} (Expected: 401)`);
    const body = await res.json();
    console.log(`Response:`, body);
    if (res.status === 401 && body.error.includes('Unauthorized')) {
      console.log('✅ PASS: Unauthenticated GET blocked');
    } else {
      console.log('❌ FAIL: Unauthenticated GET allowed or wrong error message');
    }
  } catch (err: any) {
    console.log('⚠️ Could not connect to local server. Make sure "bun dev" or local server is running to test live HTTP requests.');
  }

  // Test Endpoint 2: POST /api/community/corrections (Unauthenticated)
  try {
    const res = await fetch(`${baseUrl}/api/community/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compositionId: 'some-id',
        fieldPath: 'fullText',
        newValue: 'new text',
      }),
    });
    console.log(`\nTest 2: POST /api/community/corrections`);
    console.log(`Status: ${res.status} (Expected: 401)`);
    const body = await res.json();
    console.log(`Response:`, body);
    if (res.status === 401) {
      console.log('✅ PASS: Unauthenticated POST blocked');
    } else {
      console.log('❌ FAIL: Unauthenticated POST allowed');
    }
  } catch (err: any) {
    // Fail silently if server not active
  }

  // Test Endpoint 3: POST /api/community/corrections/some-id (Unauthenticated approval)
  try {
    const res = await fetch(`${baseUrl}/api/community/corrections/some-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve',
      }),
    });
    console.log(`\nTest 3: POST /api/community/corrections/some-id`);
    console.log(`Status: ${res.status} (Expected: 401)`);
    const body = await res.json();
    console.log(`Response:`, body);
    if (res.status === 401) {
      console.log('✅ PASS: Unauthenticated review action blocked');
    } else {
      console.log('❌ FAIL: Unauthenticated review action allowed');
    }
  } catch (err: any) {
    // Fail silently
  }

  console.log('\n🔒 Security integration tests script finished.');
}

runSecurityTests().catch((err) => {
  console.error('Fatal error running security verification:', err);
});
