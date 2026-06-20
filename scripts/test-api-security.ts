/**
 * Digital Pandharpur — Worker API Security Validation
 * Usage:
 *   bun run scripts/test-api-security.ts
 */

import { POST } from '../app/api/workers/process/route';
import { NextRequest } from 'next/server';

async function runSecurityTests() {
  console.log('🧪 Starting Worker API Endpoint Security Verification...\n');

  // Test Case 1: Request with no Authorization header
  console.log('Test 1: Request without authorization token');
  const req1 = new NextRequest('http://localhost:3000/api/workers/process', {
    method: 'POST',
  });
  const res1 = await POST(req1);
  console.log(`  - Status: ${res1.status} (Expected: 401)`);
  const data1 = await res1.json();
  console.log(`  - Response: ${JSON.stringify(data1)}`);
  const pass1 = res1.status === 401;

  // Test Case 2: Request with invalid token
  console.log('\nTest 2: Request with invalid bearer token');
  const req2 = new NextRequest('http://localhost:3000/api/workers/process', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer invalid-token-123',
    },
  });
  const res2 = await POST(req2);
  console.log(`  - Status: ${res2.status} (Expected: 401)`);
  const data2 = await res2.json();
  console.log(`  - Response: ${JSON.stringify(data2)}`);
  const pass2 = res2.status === 401;

  // Test Case 3: Request with correct token (default: dev-worker-secret)
  console.log('\nTest 3: Request with correct token (dev-worker-secret)');
  const req3 = new NextRequest('http://localhost:3000/api/workers/process', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer dev-worker-secret',
    },
  });
  const res3 = await POST(req3);
  console.log(`  - Status: ${res3.status} (Expected: 200)`);
  const data3 = await res3.json();
  console.log(`  - Response: ${JSON.stringify(data3)}`);
  const pass3 = res3.status === 200;

  if (pass1 && pass2 && pass3) {
    console.log('\n✅ All API Security and Authorization verification tests passed!');
  } else {
    console.error('\n❌ API Security verification failed!');
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
