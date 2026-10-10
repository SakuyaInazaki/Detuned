import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const repository = fileURLToPath(new URL('../../../', import.meta.url));
const evidenceRoot = path.resolve(process.env.DETUNED_WEB_EVIDENCE_DIR ?? path.join(repository, 'test-results/web'));

export default defineConfig({
  testDir: fileURLToPath(new URL('.', import.meta.url)),
  testMatch: ['author.spec.ts', 'independent.spec.ts', 'm5-c.spec.ts', 'm5-d2.spec.ts', 'm5-e1.spec.ts', 'm5-e2.spec.ts', 'm5-tls.spec.ts', 'm6-review.spec.ts', 'm6-knowledge.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: {timeout: 5000},
  reporter: [['list']],
  outputDir: path.join(evidenceRoot, 'playwright-output'),
  use: {
    channel: 'chrome',
    headless: true,
    viewport: {width: 1280, height: 900},
    serviceWorkers: 'block',
    ignoreHTTPSErrors: false,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    actionTimeout: 5000,
    navigationTimeout: 10000,
  },
});
