import { defineConfig, devices } from '@playwright/test';

/**
 * Digital Pandharpur — Playwright E2E configuration.
 *
 * The webServer boots the Next.js dev server against whatever DATABASE_URL
 * the environment points at. CI provisions a throwaway Postgres and runs
 * `db push` + `db:seed` + `scripts/seed-e2e.ts` BEFORE starting the run, so
 * the journey exercises real data and real accounts end-to-end.
 *
 * Run locally with:
 *   bun run test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  // The journey is a single sequential flow — no parallelism.
  fullyParallel: false,
  workers: 1,
  // Pre-compile every route the journey touches before the first test
  // (Next dev compiles lazily; a cold compile can stall a tight timeout).
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list']] : [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Pin a fixed port so the test's baseURL is deterministic (the project's
    // default 3000 is used by other dev servers during local work).
    command: 'bun run dev',
    url: 'http://localhost:3100/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: '3100',
    },
  },
});
