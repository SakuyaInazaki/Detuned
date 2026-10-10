import { defineConfig, defaultExclude } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [...defaultExclude, 'docs/reviews/**', 'scripts/integrations/dsh-runtime/**', 'scripts/integrations/web/**'],
  },
  resolve: {
    alias: [
      { find: /^@detuned\/client\/node$/, replacement: path.resolve(__dirname, 'packages/client/src/node.ts') },
      ...Object.entries({
      '@detuned/protocol': path.resolve(__dirname, 'packages/protocol/src/index.ts'),
      '@detuned/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@detuned/storage-sqlite': path.resolve(__dirname, 'packages/storage-sqlite/src/index.ts'),
      '@detuned/server': path.resolve(__dirname, 'packages/server/src/index.ts'),
      '@detuned/client': path.resolve(__dirname, 'packages/client/src/index.ts'),
      '@detuned/mcp': path.resolve(__dirname, 'packages/mcp/src/index.ts'),
      '@detuned/adapter-pi': path.resolve(__dirname, 'packages/adapter-pi/src/index.ts'),
      '@detuned/module-review': path.resolve(__dirname, 'modules/review/src/index.ts'),
      }).map(([find, replacement]) => ({ find, replacement })),
    ],
  },
});
