/**
 * Digital Pandharpur — E2E test user seeding.
 *
 * Creates (idempotently) the two accounts the Playwright journey needs:
 *   - e2e-contributor@varkari.test / e2e-pass-1234  (role USER)
 *   - e2e-admin@varkari.test       / e2e-pass-1234  (role ADMIN)
 *
 * Run AFTER `db:seed` (which provisions the catalog):
 *   bun run scripts/seed-e2e.ts
 */
import { db } from '../src/db/client';
import { hashPassword } from '../src/lib/auth';

const E2E_PASSWORD = 'e2e-pass-1234';

async function main(): Promise<void> {
  const password = hashPassword(E2E_PASSWORD);

  const contributor = await db.user.upsert({
    where: { email: 'e2e-contributor@varkari.test' },
    update: { password, role: 'USER' },
    create: {
      email: 'e2e-contributor@varkari.test',
      name: 'E2E Contributor',
      role: 'USER',
      password,
    },
  });

  const admin = await db.user.upsert({
    where: { email: 'e2e-admin@varkari.test' },
    update: { password, role: 'ADMIN' },
    create: {
      email: 'e2e-admin@varkari.test',
      name: 'E2E Admin',
      role: 'ADMIN',
      password,
    },
  });

  console.log(`✓ E2E users ready: contributor=${contributor.id} admin=${admin.id}`);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error('E2E user seeding failed:', err);
  await db.$disconnect();
  process.exit(1);
});
