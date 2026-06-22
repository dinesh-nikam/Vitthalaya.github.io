/**
 * Browser Launcher — provides a shared Puppeteer browser instance
 * for PDF generation and other headless browser tasks.
 */

import puppeteer from 'puppeteer-core';
import type { Browser, LaunchOptions } from 'puppeteer-core';

let browserInstance: Browser | null = null;
let browserUseCount = 0;

const DEFAULT_OPTIONS: LaunchOptions = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--font-render-hinting=none',
  ],
};

/**
 * Launch (or reuse) a Puppeteer browser instance.
 * Reuses the same instance across multiple calls to avoid
 * repeated cold starts.
 */
export async function launchBrowser(options?: LaunchOptions): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    browserUseCount++;
    return browserInstance;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check for puppeteer exec path in environment
  if (Bun.env.PUPPETEER_EXECUTABLE_PATH) {
    opts.executablePath = Bun.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (Bun.env.PUPPETEER_CHROMIUM_REVISION) {
    opts.channel = undefined; // use revision instead of channel
  }

  browserInstance = await puppeteer.launch(opts);
  browserUseCount = 1;
  return browserInstance;
}

/**
 * Gracefully close the shared browser instance.
 * Call this during server shutdown / after batch exports.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance && browserInstance.connected) {
    try {
      await browserInstance.close();
    } catch {
      // already closed
    }
  }
  browserInstance = null;
  browserUseCount = 0;
}

/** Number of active uses of the shared browser instance */
export function getBrowserUseCount(): number {
  return browserUseCount;
}
