import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  testDir: fileURLToPath(new URL('.', import.meta.url)),
  testMatch: ['author.spec.ts', 'independent.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: {timeout: 5000},
  reporter: [['list']],
  outputDir: fileURLToPath(new URL('../../../docs/reviews/2026-10-09-m5-1-b/verification/browser-output/', import.meta.url)),
  use: {
    channel: 'chrome',
    headless: true,
    viewport: {width: 1280, height: 900},
    serviceWorkers: 'block',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    actionTimeout: 5000,
    navigationTimeout: 10000,
  },
});
