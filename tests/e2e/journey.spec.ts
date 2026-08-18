/**
 * Digital Pandharpur — Critical User Journey (E2E)
 *
 * guest → homepage → search → composition read
 *       → contributor submits a recording through the /record upload pipeline
 *         (a real WAV posted to the same endpoint the in-browser recorder
 *         uses; the browser mic itself is not available headless, so the
 *         recording is generated — the pipeline, worker, and honest
 *         transcription outcome are still exercised end-to-end)
 *       → contributor submits a lyrics draft (enters moderation queue)
 *       → admin approves in the moderation panel
 *       → the published composition is searchable
 *
 * Prerequisites (see verify.yml `e2e` job): a throwaway Postgres provisioned
 * with `prisma db push`, `db:seed`, and `scripts/seed-e2e.ts` (the two
 * accounts below). The dev server is started by playwright.config.ts.
 */
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const RUN = Date.now().toString(36);
const RECORD_TITLE = `E2E भक्ती रेकॉर्डिंग ${RUN}`;
const DRAFT_TITLE = `E2E नवीन रचना ${RUN}`;
const DRAFT_LYRICS = [
  'काया ही पंढरी साच । जिहीं भेटे विठ्ठल साक्षात् ॥',
  'एका जनार्दनी प्रसाद । म्हणे नका फीरों मने वृथा ॥',
  '',
  'पंढरीचा महिमा वेगळा । तेथें राहे श्री विठ्ठला ॥',
].join('\n');

const CONTRIBUTOR = { email: 'e2e-contributor@varkari.test', password: 'e2e-pass-1234' };
const ADMIN = { email: 'e2e-admin@varkari.test', password: 'e2e-pass-1234' };

/** A valid 16-bit PCM mono WAV so the audio pipeline validates it honestly. */
function makeWavBuffer(seconds = 1): Buffer {
  const sampleRate = 16000;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2; // 16-bit mono
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  // A low-amplitude sine so the file is real audio, not pure silence.
  for (let i = 0; i < numSamples; i++) {
    const v = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 8000);
    buf.writeInt16LE(v, 44 + i * 2);
  }
  return buf;
}

/** Ensure local .env values (DATABASE_URL, GROQ_API_KEY, …) reach spawned workers. */
function loadEnv(): void {
  try {
    // Node 20.12+/Bun: load .env into process.env without overriding.
    process.loadEnvFile?.();
  } catch {
    /* no .env — CI provides env directly */
  }
}

/** Run the background worker once so queued audio jobs reach a terminal state. */
function runWorkerOnce(): void {
  loadEnv();
  const out = execSync('bun run src/cli/worker-runner.ts --run-once', {
    env: { ...process.env },
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024, // worker logs a lot; don't overflow the pipe
    encoding: 'utf8',
  });
  console.log('[worker]', out.split('\n').filter(Boolean).slice(-4).join(' | '));
}

async function login(page: import('@playwright/test').Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/signin'), { timeout: 45_000 });
}

test('critical journey: guest search → record → admin approve → searchable', async ({ page }) => {
  // ── 1. Guest on the homepage ────────────────────────────────────────────
  await test.step('guest loads the homepage', async () => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main').first()).toBeVisible();
    // Real catalog content, not an empty shell.
    await expect(page.getByText('पंढरपूर', { exact: false }).first()).toBeVisible();
  });

  // ── 2. Guest searches and opens a composition ───────────────────────────
  let compositionHref = '';
  await test.step('guest searches and opens a composition', async () => {
    await page.goto('/search?q=पांडुरंग', { waitUntil: 'domcontentloaded' });
    const links = page.locator('a[href*="/abhang/"]');
    await expect(links.first()).toBeVisible({ timeout: 30_000 });
    compositionHref = await links.first().getAttribute('href');
    expect(compositionHref).toBeTruthy();
    await page.goto(compositionHref!, { waitUntil: 'domcontentloaded' });
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 30_000 });
    const title = (await h1.innerText()).trim();
    expect(title.length).toBeGreaterThan(0);
    // Lyrics body rendered.
    await expect(page.locator('body')).toContainText('॥', { timeout: 15_000 });
  });

  // ── 3. Contributor visits /record and submits a recording ────────────────
  let recordingUploadId = '';
  await test.step('contributor logs in and submits a recording', async () => {
    await login(page, CONTRIBUTOR.email, CONTRIBUTOR.password);
    await page.goto('/record', { waitUntil: 'domcontentloaded' });
    // The recorder UI renders for a signed-in user.
    await expect(page.locator('#record-title')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('रेकॉर्डिंग सुरू करा')).toBeVisible();

    // Submit a real WAV through the exact endpoint the in-browser recorder
    // posts to (isRecording=true), mirroring handleSubmit in /record.
    const res = await page.request.post('/api/acquire/upload', {
      multipart: {
        file: {
          name: `recording-${RUN}.wav`,
          mimeType: 'audio/wav',
          buffer: makeWavBuffer(1),
        },
        isRecording: 'true',
        title: RECORD_TITLE,
        rightsStatus: 'PUBLIC_DOMAIN_COMPOSITION',
        consentGranted: 'true',
        publicationPermission: 'true',
      },
    });
    expect(res.status()).toBe(200);
    const data = (await res.json()) as { uploadId?: string; success?: boolean; error?: string };
    expect(data.success).toBe(true);
    expect(data.uploadId).toBeTruthy();
    recordingUploadId = data.uploadId!;
  });

  // ── 4. Worker processes the recording to an honest terminal state ───────
  await test.step('worker processes the recording honestly', async () => {
    runWorkerOnce();
    // Poll the status endpoint until the recording reaches a terminal state.
    const status = await expect
      .poll(
        async () => {
          const r = await page.request.get(`/api/acquire/upload/${recordingUploadId}`);
          if (!r.ok()) return null;
          const d = (await r.json()) as { processingStatus?: string; extractedText?: string | null };
          return ['completed', 'transcription_failed', 'failed'].includes(d.processingStatus ?? '')
            ? d
            : null;
        },
        { timeout: 90_000 }
      )
      .not.toBeNull();
    // Honest terminal state: with an ASR key the transcript is real text;
    // without one the recording is flagged failed — never fabricated.
    expect(status).not.toBeNull();
    const s = status as { processingStatus: string; extractedText?: string | null };
    expect(['completed', 'transcription_failed', 'failed']).toContain(s.processingStatus);
    if (s.processingStatus === 'completed') {
      expect((s.extractedText ?? '').length).toBeGreaterThan(0);
    }
    expect(s.extractedText ?? '').not.toContain('विठ्ठल रुक्मिणी पांडुरंग हरि');
  });

  // ── 5. Contributor submits a lyrics draft → moderation queue ─────────────
  await test.step('contributor submits a lyrics draft', async () => {
    const res = await page.request.post('/api/acquire/upload', {
      multipart: {
        file: {
          name: `e2e-lyrics-${RUN}.txt`,
          mimeType: 'text/plain',
          buffer: Buffer.from(DRAFT_LYRICS, 'utf8'),
        },
        title: DRAFT_TITLE,
        rightsStatus: 'PUBLIC_DOMAIN_COMPOSITION',
        consentGranted: 'true',
        publicationPermission: 'true',
      },
    });
    expect(res.status()).toBe(200);
    const data = (await res.json()) as { uploadId?: string; success?: boolean; error?: string };
    expect(data.success).toBe(true);
    expect(data.uploadId).toBeTruthy();
  });

  // ── 6. Admin approves the draft in the moderation panel ─────────────────
  await test.step('admin approves the draft', async () => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/moderation', { waitUntil: 'domcontentloaded' });

    // The queue list loads asynchronously; find the row for our draft.
    const row = page.locator('h3', { hasText: DRAFT_TITLE });
    await expect(row.first()).toBeVisible({ timeout: 45_000 });
    await row.first().click();

    await page.getByRole('button', { name: 'मंजूर करा' }).click();
    await expect(page.getByText('मत यशस्वीरित्या नोंदवले', { exact: false })).toBeVisible({
      timeout: 30_000,
    });
  });

  // ── 7. The published composition is searchable ───────────────────────────
  await test.step('published composition is searchable', async () => {
    const token = RUN; // unique ASCII token inside the title
    const res = await page.request.get(`/api/search?q=${token}`);
    expect(res.status()).toBe(200);
    const data = (await res.json()) as { results: { titleMarathi?: string }[] };
    const titles = data.results?.map((r) => r.titleMarathi ?? '') ?? [];
    expect(titles.some((t) => t.includes(DRAFT_TITLE))).toBe(true);
  });
});
